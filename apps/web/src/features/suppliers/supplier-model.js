import { emptyCustomer, normalizeCustomer, validateCustomer } from '../customers/customer-model.js';

// Documento/endereço/contato conservam as validações de Clientes; só os campos comerciais são específicos.
export const emptySupplier = () => ({
  ...emptyCustomer(),
  commercialContact: '',
  commercialEmail: '',
  commercialPhone: '',
  commercialNotes: ''
});
export function normalizeSupplier(input) {
  const supplier = { ...normalizeCustomer({ ...input, birthDate: '' }) };
  delete supplier.birthDate;
  for (const key of ['commercialContact', 'commercialEmail', 'commercialPhone', 'commercialNotes'])
    supplier[key] = String(input[key] ?? '').trim();
  supplier.commercialPhone = supplier.commercialPhone.replace(/[()\s-]/g, '');
  if (supplier.type === 'PERSON') {
    supplier.commercialEmail = '';
    supplier.commercialPhone = '';
  } else supplier.commercialNotes = '';
  return supplier;
}
export function validateSupplier(input) {
  const supplier = normalizeSupplier(input);
  const error = validateCustomer(supplier);
  if (error) return error.replace('cliente', 'fornecedor');
  // Reutiliza as mesmas regras de e-mail e telefone do contato principal.
  return (
    validateCustomer({ ...supplier, email: supplier.commercialEmail, phone: supplier.commercialPhone })
      ?.replace('e-mail', 'e-mail comercial')
      .replace('telefone e celular', 'telefone comercial') || ''
  );
}
