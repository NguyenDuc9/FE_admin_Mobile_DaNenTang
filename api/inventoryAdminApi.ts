import api from './api';

export interface InventoryChange {
  productVariantId: number;
  quantity: number;
  type: 'IMPORT' | 'ADJUSTMENT';
  delta?: number;
  note: string;
}

export async function changeInventory(data: InventoryChange): Promise<void> {
  const endpoint =
    data.type === 'IMPORT'
      ? '/api/inventory/import'
      : '/api/inventory/adjustment';
  await api.post(endpoint, data);
}
