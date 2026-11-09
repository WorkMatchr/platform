"""Preflight for a dedicated Ubuntu live host. Run from the host mount namespace."""
import json
import os
import subprocess
from pathlib import Path

GIB = 1024**3
MAX_DUMP = GIB // 2


def output(*args):
    return subprocess.check_output(args, text=True).strip()


def require(condition, reason):
    if not condition:
        raise RuntimeError(reason)


def available():
    fields = dict(line.split(":") for line in Path("/proc/meminfo").read_text().splitlines())
    return int(fields["MemAvailable"].split()[0]) * 1024


def capacity(ram, space):
    require(ram >= 2 * GIB, "RAM reserve below 2 GiB")
    require(space >= MAX_DUMP + 64 * 1024**2, "Insufficient tmpfs space")


def ram_path(path):
    fs = output("findmnt", "-n", "-o", "FSTYPE", "-T", str(path))
    require(fs in ("tmpfs", "ramfs"), f"RAM mount required: {path}")


def offline(name, state):
    require(name == "lo" or state == "down", "disconnect external network")


def preflight():
    require(os.geteuid() == 0 and Path("/run/casper").exists() or
            os.geteuid() == 0 and "boot=casper" in Path("/proc/cmdline").read_text().split(),
            "Ubuntu live host required")
    require(os.readlink("/proc/self/ns/mnt") == os.readlink("/proc/1/ns/mnt"), "host namespace required")
    require(not Path("/proc/swaps").read_text().splitlines()[1:], "active swap")
    require(Path("/sys/kernel/kexec_crash_loaded").read_text().strip() == "0", "kdump enabled")
    require(subprocess.run(["systemctl","is-enabled","hibernate.target"], capture_output=True, text=True).stdout.strip() == "masked", "mask hibernation")
    require(Path("/proc/sys/kernel/core_pattern").read_text().strip() == "|/bin/false", "core handler must discard dumps")
    for nic in Path("/sys/class/net").iterdir():
        offline(nic.name, nic.joinpath("operstate").read_text().strip())
    for line in output("findmnt", "-rn", "-o", "TARGET,FSTYPE,OPTIONS").splitlines():
        target, fs, opts = line.split(maxsplit=2)
        if "rw" not in opts.split(","):
            continue
        if fs == "overlay":
            upper = [o[9:] for o in opts.split(",") if o.startswith("upperdir=")]
            require(len(upper) == 1, "unknown overlay")
            ram_path(upper[0])
        else:
            require(fs in {"tmpfs","ramfs","proc","sysfs","devtmpfs","devpts","cgroup2","mqueue",
                           "securityfs","debugfs","tracefs","hugetlbfs","bpf",
                           "configfs","fusectl","autofs","binfmt_misc"}, f"unexpected writable mount: {target}")
    disks = json.loads(output("lsblk","--tree","-J","-o","TYPE,TRAN,MOUNTPOINTS"))["blockdevices"]
    def mounted(device):
        return any(device.get("mountpoints") or []) or any(mounted(c) for c in device.get("children", []))
    for disk in disks:
        if disk["type"] == "disk" and disk.get("tran") != "usb":
            require(not mounted(disk), "internal disk mounted")
    for path in ["/run", "/tmp", "/dev/shm", "/var/lib/containerd",
                 output("docker","info","--format","{{.DockerRootDir}}")]:
        ram_path(path)
    capacity(available(), os.statvfs("/dev/shm").f_bavail * os.statvfs("/dev/shm").f_frsize)
