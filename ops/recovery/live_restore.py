"""Run only the bundled synthetic fixture on an offline, nonpersistent Ubuntu live host."""
import json
import os
import signal
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from live_host import GIB, available, output, preflight, require

def run():
    os.environ.clear()
    os.environ.update(PATH="/usr/sbin:/usr/bin:/sbin:/bin", HOME="/run", DOCKER_HOST="unix:///var/run/docker.sock")
    preflight()
    require(available() >= 8 * GIB, "insufficient startup margin")
    name = "wm-live-fixture-" + uuid.uuid4().hex
    script = Path(__file__).resolve().with_name("live-fixture.sh")
    metrics = dict(min_available=available(), pg_container_peak=0, daemon_rss_peak=0, tmpfs_peak_used=0)
    cgroup = None
    def oom():
        return int(output("awk", '$1=="oom_kill"{print $2}', "/proc/vmstat"))
    initial_oom = oom()
    with tempfile.TemporaryDirectory(dir="/dev/shm") as directory:
        start = time.monotonic()
        child = subprocess.Popen(["bash",script,directory,name], cwd=script.parent, start_new_session=True)
        try:
            while True:
                mem = available()
                metrics["min_available"] = min(mem,metrics["min_available"])
                require(mem >= 2 * GIB and oom() == initial_oom, "memory safety margin or OOM")
                require(time.monotonic()-start < 600, "fixture timeout")
                rss = 0
                for proc in Path("/proc").glob("[0-9]*"):
                    try:
                        if (proc/"comm").read_text().strip() in {"dockerd","containerd"}:
                            rss += int((proc/"statm").read_text().split()[1])*os.sysconf("SC_PAGE_SIZE")
                    except FileNotFoundError:
                        continue
                metrics["daemon_rss_peak"] = max(metrics["daemon_rss_peak"],rss)
                pid = subprocess.run(["docker","inspect","-f","{{.State.Pid}}",name],capture_output=True,text=True).stdout.strip()
                if pid.isdigit() and int(pid):
                    cgroup = Path("/sys/fs/cgroup") / Path(f"/proc/{pid}/cgroup").read_text().strip().split("0::")[-1].lstrip("/")
                    metrics["pg_container_peak"] = max(metrics["pg_container_peak"],int((cgroup/"memory.peak").read_text()))
                    for p in ["/dev/shm",f"/proc/{pid}/root/var/lib/postgresql","/var/lib/containerd",output("docker","info","--format","{{.DockerRootDir}}")]:
                        st = os.statvfs(p)
                        metrics["tmpfs_peak_used"] = max(metrics["tmpfs_peak_used"],(st.f_blocks-st.f_bfree)*st.f_frsize)
                if child.poll() is not None:
                    break
                time.sleep(0.5)
            require(child.returncode == 0 and cgroup and metrics["daemon_rss_peak"], "fixture or telemetry incomplete")
        finally:
            if child.poll() is None:
                os.killpg(child.pid,signal.SIGKILL)
                child.wait()
            if name in output("docker","ps","-a","--format","{{.Names}}").splitlines():
                subprocess.run(["docker","rm","-f",name],check=True,stdout=subprocess.DEVNULL)
            if Path(directory,"keys").is_dir():
                subprocess.run(["gpgconf","--homedir",directory+"/keys","--kill","gpg-agent"],check=True)
            print(json.dumps(dict(metrics, oom_delta=oom()-initial_oom)))
if __name__ == "__main__":
    run()
