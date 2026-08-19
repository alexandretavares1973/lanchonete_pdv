// Utilitário para formatação ESC/POS e integração com impressoras térmicas

export interface ReceiptData {
  orderId: number | string;
  createdAt: Date | string;
  customerName?: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  total: number;
  paymentMethod: string;
  change?: number;
  receivedAmount?: number;
}

export function formatThermalReceipt(data: ReceiptData): string {
  const line = "--------------------------------";
  const dateStr = new Date(data.createdAt).toLocaleString("pt-BR");
  const customer = data.customerName || "GERAL";

  let content = "";
  content += "\x1b\x61\x01"; // Centralizar
  content += "\x1b\x21\x30"; // Altura e largura dupla
  content += "LANCHONETE PDV\n";
  content += "\x1b\x21\x00"; // Normal
  content += "Sistema de Vendas\n";
  content += line + "\n";
  
  content += "\x1b\x61\x00"; // Alinhar à esquerda
  content += `PEDIDO #${data.orderId}\n`;
  content += `Data: ${dateStr}\n`;
  content += `Cliente: ${customer}\n`;
  content += line + "\n";
  
  content += "QTD DESC              R$ TOTAL\n";
  content += line + "\n";

  data.items.forEach((item) => {
    const qtyStr = String(item.quantity).padStart(3, " ");
    const nameStr = item.productName.padEnd(16, " ").substring(0, 16);
    const totalStr = item.subtotal.toFixed(2).padStart(8, " ");
    content += `${qtyStr} ${nameStr} ${totalStr}\n`;
  });

  content += line + "\n";
  content += `TOTAL: R$ ${data.total.toFixed(2).padStart(22, " ")}\n`;
  content += `Forma Pgto: ${data.paymentMethod.toUpperCase()}\n`;
  
  if (data.receivedAmount !== undefined && data.receivedAmount > 0) {
    content += `Valor Recebido: R$ ${data.receivedAmount.toFixed(2)}\n`;
  }
  if (data.change !== undefined && data.change > 0) {
    content += `Troco: R$ ${data.change.toFixed(2)}\n`;
  }

  content += line + "\n";
  content += "\x1b\x61\x01"; // Centralizar rodapé
  content += "Obrigado pela preferencia!\n";
  content += "Volte sempre!\n\n\n";
  content += "\x1b\x56\x41"; // Corte de papel (ESC/POS cut)

  return content;
}

export async function printViaWebBluetooth(data: ReceiptData): Promise<boolean> {
  if (!("navigator" in window) || !(navigator as any).bluetooth) {
    throw new Error("Web Bluetooth não é suportado neste navegador. Use o Chrome ou Edge.");
  }

  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb", // Serviço comum ESC/POS Bluetooth
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      ],
    });

    const server = await device.gatt.connect();
    // Tentar encontrar o characteristic de escrita ESC/POS
    const services = await server.getPrimaryServices();
    let writeCharacteristic = null;

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char;
            break;
          }
        }
      } catch (e) {
        // Ignorar serviços sem permissão
      }
      if (writeCharacteristic) break;
    }

    if (!writeCharacteristic) {
      throw new Error("Nenhuma característica de escrita encontrada na impressora Bluetooth.");
    }

    const rawText = formatThermalReceipt(data);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(rawText);

    // Enviar em blocos de 512 bytes para evitar estouro de buffer
    const chunkSize = 512;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      await writeCharacteristic.writeValue(chunk);
    }

    return true;
  } catch (error: any) {
    console.error("Erro na impressão Bluetooth:", error);
    throw error;
  }
}
