import "server-only";
import QRCode from "qrcode";

export async function generateQrDataUrl(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: 200,
    margin: 1,
    color: {
      dark: "#5B1424",
      light: "#FCFAF7",
    },
  });
}
