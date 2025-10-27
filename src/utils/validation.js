/**
 * Util: validation
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Funções auxiliares de validação de dados (ex.: CPF/telefone).
 */
// Validações de CPF e telefone (Brasil)
function onlyDigits(str) {
  return String(str).replace(/\D/g, '');
}

function validateCPF(cpf) {
  cpf = onlyDigits(cpf);
  if (!cpf || cpf.length !== 11) {
    return false;
  }
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  } // todos iguais
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) {
    resto = 0;
  }
  if (resto !== parseInt(cpf.charAt(9))) {
    return false;
  }
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) {
    resto = 0;
  }
  return resto === parseInt(cpf.charAt(10));
}

function validatePhone(phone) {
  const d = onlyDigits(phone);
  // Aceita 10 ou 11 dígitos (fixo ou celular) + códigos regionais válidos.
  return d.length === 10 || d.length === 11;
}

module.exports = { validateCPF, validatePhone, onlyDigits };
