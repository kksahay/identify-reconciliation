export class ContactTrail {
  primaryContactId!: number;
  emails: string[] = [];
  phoneNumbers: string[] = [];
  secondaryContactIds: number[] = [];

  constructor(data?: Partial<ContactTrail>) {
    Object.assign(this, data);
  }
}

export class ReconciliationResponse {
  contact!: ContactTrail;
}

export class SecondaryContacts {
  id!: number;
  email!: string;
  phoneNumber!: string;
}
