export class Logger {
  static info(message: string): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  }
  static warn(message: string, obj?: any): void {
    console.log(`[WARN] ${new Date().toISOString()} - ${message}` + obj);
  }
  static infoObj(message: string, obj: any): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message} ;` + obj);
  }
  static error(message: string): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
  }
}
