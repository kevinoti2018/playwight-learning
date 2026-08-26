export interface ChekoutInfo{
  firstName: string,
  lastName: string
  zip:string
}

export class CheckoutInfoBuilder{
  // Deterministic defaults — every field always has a valid value,
   // so build() never produces an invalid/incomplete object even if
   // the test overrides nothing at all.
   private data: ChekoutInfo = {
     firstName: 'Jane',
     lastName: 'Doe',
     zip: '90210',
   };
  withFirstName(firstName: string) {
    this.data.firstName = firstName
    return this
  }
  withLastName(lastName: string) {
    this.data.lastName = lastName
    return this
  }
  withZip(zip: string) {
    this.data.zip = zip
    return this
  }
  build():ChekoutInfo {
  return {...this.data}
}
}
