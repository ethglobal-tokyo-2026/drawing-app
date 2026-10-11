type Command = (tool: "simctl" | "devicectl", args: string[]) => Promise<unknown>;

/** Controls only the selected simulator and remembers whether this run booted it. */
export class IpadSimulator {
  private owned = false;

  readonly udid: string;
  private readonly alreadyBooted: boolean;
  private readonly command: Command;

  constructor(udid: string, alreadyBooted: boolean, command: Command) {
    this.udid = udid;
    this.alreadyBooted = alreadyBooted;
    this.command = command;
  }

  async boot() {
    if (!this.alreadyBooted) {
      await this.command("simctl", ["boot", this.udid]);
      this.owned = true;
    }
    await this.command("simctl", ["bootstatus", this.udid, "-b"]);
  }

  async orient(orientation: "portrait" | "landscapeLeft") {
    await this.command("devicectl", [
      "device",
      "orientation",
      "set",
      "--device",
      this.udid,
      orientation,
      "--timeout",
      "30",
    ]);
  }

  async shutdown() {
    if (this.owned) {
      await this.command("simctl", ["shutdown", this.udid]);
      this.owned = false;
    }
  }
}
