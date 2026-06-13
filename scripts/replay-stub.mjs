const hasDemoFlag = process.argv.slice(2).includes("--demo");

if (hasDemoFlag) {
  console.log(
    "TODO(DW-P0A-002): Event Store + ReplayEngine are not implemented yet. This DW-P0A-001 demo replay stub exits 0."
  );
} else {
  console.log(
    "TODO(DW-P0A-002): replay command is a stub. Pass --demo to exercise the current placeholder path."
  );
}
