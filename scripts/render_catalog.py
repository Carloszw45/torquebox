"""Render the TorqueBox storefront without modifying QIFOR."""
import sys
sys.dont_write_bytecode = True
from render_catalog_store import main

if __name__ == "__main__":
    main()
