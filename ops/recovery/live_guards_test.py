import unittest
from unittest.mock import patch
from live_host import GIB, capacity, offline, ram_path


class Guards(unittest.TestCase):
    def test_low_ram(self):
        with self.assertRaises(RuntimeError):
            capacity(2*GIB-1, GIB)

    def test_low_space(self):
        with self.assertRaises(RuntimeError):
            capacity(3*GIB, GIB//2)

    def test_persistent_storage(self):
        with patch("live_host.output", return_value="ext4"), self.assertRaises(RuntimeError):
            ram_path("/tmp")

    def test_network(self):
        with self.assertRaises(RuntimeError):
            offline("eth0", "up")


if __name__ == "__main__":
    unittest.main()
