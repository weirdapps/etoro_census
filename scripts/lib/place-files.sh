#!/bin/bash
# Shared placement helpers for the census sync scripts.
#
# public/ and archive/ hold the same dataset. Storing it twice is expensive:
# 52.09 GiB on the Mac (2026-08-27) and 54 GB on the VPS (2026-08-31, on a
# 150 GB root volume that was 79% full). The cheap way to place a file depends
# on the host, so probe once and reuse the answer:
#
#   clone     macOS/APFS. `cp -c` puts both sides on shared blocks. Real files
#             on both sides, distinct inodes, no symlink anywhere.
#   hardlink  Linux, archive/ and public/ on the SAME filesystem.
#   symlink   Linux, DIFFERENT filesystems. This is the VPS, where archive/ is
#             a symlink to /mnt/data/census-archive (sdb) while public/ lives
#             on / (sda1). Hardlinks cannot cross devices and ext4 has no
#             reflink, so a symlink is the only instrument left.
#
# Both callers source this so the two scripts cannot drift apart. They already
# did once: sync-data-archive.sh was fixed while sync-all-data.sh, the script
# the VPS actually runs, was left writing full copies.
#
# Every function returns 0. Callers run under `set -e` and a placement that
# cannot be optimised must degrade to a plain copy, never abort the sync.

# GNU first, BSD second, and the order is load-bearing. GNU `stat -f '%d' path`
# does NOT mean "device id of path": -f is --file-system and the format belongs
# to -c, so GNU reads both words as filenames, fails on '%d', succeeds on path,
# and prints a whole filesystem dump to stdout while still exiting nonzero.
# Probing BSD-first therefore returns dump+id concatenated on Linux, and since
# the dump embeds the path, two directories on ONE filesystem would never
# compare equal and hardlink mode could never be selected. macOS rejects -c
# with rc=1 and an empty stdout, so GNU-first is clean on both.
_dev_of() { stat -c '%d' "$1" 2>/dev/null || stat -f '%d' "$1" 2>/dev/null; }

# detect_link_mode <src_dir> <dst_dir> -> echoes clone | hardlink | symlink
detect_link_mode() {
  _dlm_probe=$(mktemp 2>/dev/null) || _dlm_probe=""
  if [ -n "$_dlm_probe" ] && cp -c "$_dlm_probe" "${_dlm_probe}.clone" 2>/dev/null; then
    rm -f "$_dlm_probe" "${_dlm_probe}.clone" 2>/dev/null || true
    echo "clone"; return 0
  fi
  rm -f "$_dlm_probe" "${_dlm_probe}.clone" 2>/dev/null || true
  if [ "$(_dev_of "$1")" = "$(_dev_of "$2")" ]; then echo "hardlink"; else echo "symlink"; fi
  return 0
}

# place_one <mode> <src_file> <dst_dir> <src_dir_relative_to_repo_root>
place_one() {
  _po_mode="$1"; _po_f="$2"; _po_dst="$3"; _po_rel="$4"
  [ -e "$_po_f" ] || return 0
  _po_bn=$(basename "$_po_f")

  if [ "$_po_mode" = "clone" ]; then
    # Do not try to skip an existing clone: an APFS clone has a DISTINCT inode,
    # so -ef is the wrong test here, and re-cloning costs no disk anyway.
    cp -c "$_po_f" "$_po_dst/$_po_bn" 2>/dev/null \
      || cp "$_po_f" "$_po_dst/$_po_bn" 2>/dev/null || true
    return 0
  fi

  # -ef is same device+inode and follows symlinks, so it is true for an existing
  # hardlink AND an existing good symlink, and false for a broken one.
  [ "$_po_dst/$_po_bn" -ef "$_po_f" ] && return 0

  if [ "$_po_mode" = "hardlink" ]; then
    ln -f "$_po_f" "$_po_dst/$_po_bn" 2>/dev/null \
      || cp "$_po_f" "$_po_dst/$_po_bn" 2>/dev/null || true
  else
    # Relative, so the tree stays valid if the repo moves. public/<x>/<f> needs
    # two levels up to reach the repo root before descending into $_po_rel.
    if ln -sfn "../../$_po_rel/$_po_bn" "$_po_dst/$_po_bn.tmplink" 2>/dev/null; then
      mv -f "$_po_dst/$_po_bn.tmplink" "$_po_dst/$_po_bn" 2>/dev/null \
        || rm -f "$_po_dst/$_po_bn.tmplink" 2>/dev/null || true
    else
      cp "$_po_f" "$_po_dst/$_po_bn" 2>/dev/null || true
    fi
  fi
  return 0
}

# place_files <mode> <src_dir> <dst_dir> <glob> <src_dir_relative_to_repo_root>
place_files() {
  _pf_mode="$1"; _pf_src="$2"; _pf_dst="$3"; _pf_pat="$4"; _pf_rel="$5"
  for _pf_file in "$_pf_src"/$_pf_pat; do
    place_one "$_pf_mode" "$_pf_file" "$_pf_dst" "$_pf_rel"
  done
  return 0
}
