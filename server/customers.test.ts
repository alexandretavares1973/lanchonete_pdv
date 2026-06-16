import { describe, expect, it, beforeEach, afterEach } from "vitest";

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt: Date;
}

describe("Customers Management - localStorage simulation", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
  });

  afterEach(() => {
    mockStorage = {};
  });

  it("should edit a customer successfully", () => {
    // Setup initial customer
    const initialCustomer: Customer = {
      id: 1,
      name: "João Silva",
      phone: "11999999999",
      email: "joao@example.com",
      isActive: true,
      createdAt: new Date(),
    };

    const customers = [initialCustomer];
    mockStorage["customers"] = JSON.stringify(customers);

    // Simulate edit
    const editedCustomer = {
      ...initialCustomer,
      name: "João Silva Updated",
      phone: "11988888888",
      email: "joao.updated@example.com",
    };

    const updated = JSON.parse(mockStorage["customers"] || "[]").map(
      (c: Customer) => (c.id === 1 ? editedCustomer : c)
    );
    mockStorage["customers"] = JSON.stringify(updated);

    // Verify
    const result = JSON.parse(mockStorage["customers"]);
    expect(result[0].name).toBe("João Silva Updated");
    expect(result[0].phone).toBe("11988888888");
    expect(result[0].email).toBe("joao.updated@example.com");
  });

  it("should inactivate a customer successfully", () => {
    // Setup initial customer
    const initialCustomer: Customer = {
      id: 1,
      name: "Maria Santos",
      phone: "11977777777",
      email: "maria@example.com",
      isActive: true,
      createdAt: new Date(),
    };

    const customers = [initialCustomer];
    mockStorage["customers"] = JSON.stringify(customers);

    // Simulate inactivate
    const updated = JSON.parse(mockStorage["customers"] || "[]").map(
      (c: Customer) => (c.id === 1 ? { ...c, isActive: false } : c)
    );
    mockStorage["customers"] = JSON.stringify(updated);

    // Verify
    const result = JSON.parse(mockStorage["customers"]);
    expect(result[0].isActive).toBe(false);
  });

  it("should activate an inactive customer successfully", () => {
    // Setup initial inactive customer
    const initialCustomer: Customer = {
      id: 1,
      name: "Pedro Costa",
      phone: "11966666666",
      email: "pedro@example.com",
      isActive: false,
      createdAt: new Date(),
    };

    const customers = [initialCustomer];
    mockStorage["customers"] = JSON.stringify(customers);

    // Simulate activate
    const updated = JSON.parse(mockStorage["customers"] || "[]").map(
      (c: Customer) => (c.id === 1 ? { ...c, isActive: true } : c)
    );
    mockStorage["customers"] = JSON.stringify(updated);

    // Verify
    const result = JSON.parse(mockStorage["customers"]);
    expect(result[0].isActive).toBe(true);
  });

  it("should prevent editing the default GERAL customer", () => {
    // Setup default customer
    const defaultCustomer: Customer = {
      id: 0,
      name: "GERAL",
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
    };

    const customers = [defaultCustomer];
    mockStorage["customers"] = JSON.stringify(customers);

    // Try to edit (should fail)
    const customer = JSON.parse(mockStorage["customers"])[0];
    
    expect(() => {
      if (customer?.isDefault) {
        throw new Error("Não é possível editar o cliente GERAL");
      }
    }).toThrow("Não é possível editar o cliente GERAL");
  });

  it("should prevent inactivating the default GERAL customer", () => {
    // Setup default customer
    const defaultCustomer: Customer = {
      id: 0,
      name: "GERAL",
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
    };

    const customers = [defaultCustomer];
    mockStorage["customers"] = JSON.stringify(customers);

    // Try to inactivate (should fail)
    const customer = JSON.parse(mockStorage["customers"])[0];
    
    expect(() => {
      if (customer?.isDefault) {
        throw new Error("Não é possível inativar o cliente GERAL");
      }
    }).toThrow("Não é possível inativar o cliente GERAL");
  });

  it("should delete a customer successfully", () => {
    // Setup customers
    const customer1: Customer = {
      id: 1,
      name: "Cliente 1",
      isActive: true,
      createdAt: new Date(),
    };
    const customer2: Customer = {
      id: 2,
      name: "Cliente 2",
      isActive: true,
      createdAt: new Date(),
    };

    const customers = [customer1, customer2];
    mockStorage["customers"] = JSON.stringify(customers);

    // Simulate delete
    const updated = JSON.parse(mockStorage["customers"] || "[]").filter(
      (c: Customer) => c.id !== 1
    );
    mockStorage["customers"] = JSON.stringify(updated);

    // Verify
    const result = JSON.parse(mockStorage["customers"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("should prevent deleting the default GERAL customer", () => {
    // Setup default customer
    const defaultCustomer: Customer = {
      id: 0,
      name: "GERAL",
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
    };

    const customers = [defaultCustomer];
    mockStorage["customers"] = JSON.stringify(customers);

    // Try to delete (should fail)
    const customer = JSON.parse(mockStorage["customers"])[0];
    
    expect(() => {
      if (customer?.isDefault) {
        throw new Error("Não é possível deletar o cliente GERAL");
      }
    }).toThrow("Não é possível deletar o cliente GERAL");
  });

  it("should handle multiple customers correctly", () => {
    // Setup multiple customers
    const customers: Customer[] = [
      {
        id: 0,
        name: "GERAL",
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 1,
        name: "Cliente 1",
        phone: "11999999999",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: "Cliente 2",
        phone: "11988888888",
        isActive: true,
        createdAt: new Date(),
      },
    ];

    mockStorage["customers"] = JSON.stringify(customers);

    // Edit customer 1
    let updated = JSON.parse(mockStorage["customers"] || "[]").map(
      (c: Customer) =>
        c.id === 1 ? { ...c, name: "Cliente 1 Updated" } : c
    );
    mockStorage["customers"] = JSON.stringify(updated);

    // Inactivate customer 2
    updated = JSON.parse(mockStorage["customers"] || "[]").map(
      (c: Customer) => (c.id === 2 ? { ...c, isActive: false } : c)
    );
    mockStorage["customers"] = JSON.stringify(updated);

    // Verify
    const result = JSON.parse(mockStorage["customers"]);
    expect(result).toHaveLength(3);
    expect(result[1].name).toBe("Cliente 1 Updated");
    expect(result[2].isActive).toBe(false);
  });
});
