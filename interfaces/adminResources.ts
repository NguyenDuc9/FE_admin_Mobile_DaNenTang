export type ResourceValue = string | number | boolean | null;

export interface ResourceRow {
  id: number;
  [key: string]: ResourceValue;
}

export type ResourceFieldType =
  | 'text'
  | 'number'
  | 'url'
  | 'image'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'datetime-local'
  | 'json'
  | 'template-items';

export interface ResourceField {
  name: string;
  label: string;
  type: ResourceFieldType;
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  source?: string;
  default?: string | number | boolean;
  serializeFrom?: (value: unknown) => string;
  options?: { value: string; label: string }[];
  optionsEndpoint?: string;
  optionLabel?: string;
  optionValue?: string;
  valueType?: 'number';
}

export interface ResourceColumn {
  name: string;
  label: string;
}

export interface ResourceDefinition {
  title: string;
  description: string;
  endpoint: string;
  filters?: {
    name: string;
    label: string;
    allLabel: string;
    options: { value: string; label: string }[];
  }[];
  clientSideFilters?: boolean;
  fields: ResourceField[];
  columns: ResourceColumn[];
  allowEdit?: boolean;
  allowDelete?: boolean;
  statusField?: string;
  loadOneForEdit?: boolean;
  updateMethod?: 'PUT' | 'PATCH';
  lookups?: {
    name: string;
    endpoint: string;
    label: string;
  }[];
}
