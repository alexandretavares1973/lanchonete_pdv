// Utilitário ESC/POS para impressoras térmicas via Bluetooth e USB (Web Serial) com Histórico de Impressão

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
  customHeader?: string;
  customFooter?: string;
}

export interface PrintLogEntry {
  id: string;
  timestamp: string;
  orderId: number | string;
  customerName: string;
  total: number;
  method: "Bluetooth" | "USB Serial";
  status: "Sucesso" | "Falha";
  error?: string;
  data: ReceiptData;
}

export function getPrintHistory(): PrintLogEntry[] {
  try {
    const raw = localStorage.getItem("thermal_print_history");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function savePrintHistoryEntry(entry: Omit<PrintLogEntry, "id" | "timestamp">) {
  try {
    const history = getPrintHistory();
    const newEntry: PrintLogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
    // Manter últimos 50 registros
    const updated = [newEntry, ...history].slice(0, 50);
    localStorage.setItem("thermal_print_history", JSON.stringify(updated));
  } catch (e) {
    console.error("Falha ao salvar histórico de impressão:", e);
  }
}

export function clearPrintHistory() {
  localStorage.removeItem("thermal_print_history");
}

export function formatThermalReceipt(data: ReceiptData): string {
  const line = "--------------------------------";
  const dateStr = new Date(data.createdAt).toLocaleString("pt-BR");
  const customer = data.customerName || "GERAL";
  const header = data.customHeader || "LANCHONETE PDV\nSistema de Vendas";
  const footer = data.customFooter || "Obrigado pela preferencia!\nVolte sempre!";

  let content = "";
  content += "\x1b\x61\x01"; // Centralizar
  content += "\x1b\x21\x30"; // Altura e largura dupla
  content += header + "\n";
  content += "\x1b\x21\x00"; // Normal
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
  content += footer + "\n\n\n";
  content += "\x1b\x56\x41"; // Corte de papel (ESC/POS cut)

  return content;
}

export async function printViaWebBluetooth(data: ReceiptData): Promise<boolean> {
  const customHeader = localStorage.getItem("thermal_header") || undefined;
  const customFooter = localStorage.getItem("thermal_footer") || undefined;
  const fullData = { ...data, customHeader, customFooter };

  if (!("navigator" in window) || !(navigator as any).bluetooth) {
    const err = new Error("Web Bluetooth não é suportado neste navegador. Use o Chrome ou Edge.");
    savePrintHistoryEntry({
      orderId: data.orderId,
      customerName: data.customerName || "GERAL",
      total: data.total,
      method: "Bluetooth",
      status: "Falha",
      error: err.message,
      data: fullData,
    });
    throw err;
  }

  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb",
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      ],
    });

    const server = await device.gatt.connect();
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
        // Ignorar
      }
      if (writeCharacteristic) break;
    }

    if (!writeCharacteristic) {
      throw new Error("Nenhuma característica de escrita encontrada na impressora Bluetooth.");
    }

    const rawText = formatThermalReceipt(fullData);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(rawText);

    const chunkSize = 512;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      await writeCharacteristic.writeValue(chunk);
    }

    savePrintHistoryEntry({
      orderId: data.orderId,
      customerName: data.customerName || "GERAL",
      total: data.total,
      method: "Bluetooth",
      status: "Sucesso",
      data: fullData,
    });

    return true;
  } catch (err: any) {
    savePrintHistoryEntry({
      orderId: data.orderId,
      customerName: data.customerName || "GERAL",
      total: data.total,
      method: "Bluetooth",
      status: "Falha",
      error: err?.message || "Erro desconhecido Bluetooth",
      data: fullData,
    });
    throw err;
  }
}

export async function printViaWebSerial(data: ReceiptData): Promise<boolean> {
  const customHeader = localStorage.getItem("thermal_header") || undefined;
  const customFooter = localStorage.getItem("thermal_footer") || undefined;
  const fullData = { ...data, customHeader, customFooter };

  if (!("navigator" in window) || !(navigator as any).serial) {
    const err = new Error("Web Serial API não é suportada neste navegador. Use o Google Chrome ou Microsoft Edge.");
    savePrintHistoryEntry({
      orderId: data.orderId,
      customerName: data.customerName || "GERAL",
      total: data.total,
      method: "USB Serial",
      status: "Falha",
      error: err.message,
      data: fullData,
    });
    throw err;
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    const rawText = formatThermalReceipt(fullData);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(rawText);

    try {
      await writer.write(bytes);
    } finally {
      writer.releaseLock();
      await port.close();
    }

    savePrintHistoryEntry({
      orderId: data.orderId,
      customerName: data.customerName || "GERAL",
      total: data.total,
      method: "USB Serial",
      status: "Sucesso",
      data: fullData,
    });

    return true;
  } catch (err: any) {
    savePrintHistoryEntry({
      orderId: data.orderId,
      customerName: data.customerName || "GERAL",
      total: data.total,
      method: "USB Serial",
      status: "Falha",
      error: err?.message || "Erro desconhecido USB Serial",
      data: fullData,
    });
    throw err;
  }
}

export async function testPrinterCutAndPrint(interfaceType: "bluetooth" | "serial"): Promise<boolean> {
  const testData: ReceiptData = {
    orderId: "TESTE",
    createdAt: new Date(),
    customerName: "OPERADOR TESTE",
    items: [
      { productName: "Produto Teste", quantity: 1, price: 10.0, subtotal: 10.0 }
    ],
    total: 10.0,
    paymentMethod: "PIX",
    customHeader: "TESTE DE IMPRESSORA\nLanchonete PDV",
    customFooter: "Teste concluído com sucesso!"
  };

  if (interfaceType === "bluetooth") {
    return await printViaWebBluetooth(testData);
  } else {
    return await printViaWebSerial(testData);
  }
}
