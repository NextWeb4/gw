export class StarredRecordRevisionGate {
  private revision = 0;

  beginReload() {
    return this.revision;
  }

  markUserMutation() {
    this.revision += 1;
  }

  canApplyReload(startedAtRevision: number) {
    return startedAtRevision === this.revision;
  }
}
