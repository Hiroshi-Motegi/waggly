import Payjp from "payjp";

let _client: ReturnType<typeof Payjp> | null = null;

export function getPayjpClient() {
  if (!_client) {
    _client = Payjp(process.env.PAYJP_SECRET_KEY!);
  }
  return _client;
}
