/* ------------------------------------------------------------------ */
/*  Documentos legales (PDF, abren en nueva pestaña)                   */
/*  Compartido entre login, register y cualquier página futura         */
/* ------------------------------------------------------------------ */
export const legalDocs = {
  privacidad: 'https://teusec-legal-docs.s3.us-east-2.amazonaws.com/POL%C3%8DTICA+DE+PRIVACIDAD.pdf',
  terminos:   'https://teusec-legal-docs.s3.us-east-2.amazonaws.com/T%C3%89RMINOS+Y+CONDICIONES+DE+USO.pdf',
  datos:      'https://teusec-legal-docs.s3.us-east-2.amazonaws.com/ACUERDO+DE+TRATAMIENTO+DE+DATOS+PERSONALES+(DPA).pdf',
}

export const legalLinks = [
  { label: 'Política de Privacidad',          href: legalDocs.privacidad },
  { label: 'Términos y Condiciones',          href: legalDocs.terminos },
  { label: 'Tratamiento de Datos Personales', href: legalDocs.datos },
]
