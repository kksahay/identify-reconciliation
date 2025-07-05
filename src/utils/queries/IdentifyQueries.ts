import { client } from "../../server";
import type { Contact, SecondaryContacts, User } from "../types";

export class IdentifyQueries {
  async checkEmail(user: User): Promise<Contact> {
    const query = {
      text: `
      SELECT 
        id, 
        phone_number AS "phoneNumber", 
        email, 
        linked_id AS "linkedId", 
        link_precedence AS "linkPrecedence", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt", 
        deleted_at as "deletedAt" 
      FROM public.contacts 
      WHERE email = $1
      ORDER BY link_precedence ASC LIMIT 1
    `,
      values: [user.email],
    };
    const res = await client.query(query);
    return res.rows[0] as Contact;
  }

  async checkPhone(user: User): Promise<Contact> {
    const query = {
      text: `
      SELECT 
        id, 
        phone_number AS "phoneNumber", 
        email, 
        linked_id AS "linkedId", 
        link_precedence AS "linkPrecedence", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt", 
        deleted_at as "deletedAt" 
      FROM public.contacts 
      WHERE phone_number = $1
      ORDER BY link_precedence ASC LIMIT 1
    `,
      values: [user.phoneNumber],
    };
    const res = await client.query(query);
    return res.rows[0] as Contact;
  }

  async checkRepeat(user: User): Promise<Contact> {
    const query = {
      text: `
      SELECT 
        id, 
        phone_number AS "phoneNumber", 
        email, 
        linked_id AS "linkedId", 
        link_precedence AS "linkPrecedence", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt", 
        deleted_at as "deletedAt" 
      FROM public.contacts 
      WHERE phone_number = $1
      AND email = $2
    `,
      values: [user.phoneNumber, user.email],
    };
    const res = await client.query(query);
    return res.rows[0] as Contact;
  }

  async insertPrimaryContact(user: User): Promise<Contact> {
    const query = {
      text: `
      INSERT INTO public.contacts(phone_number, email, link_precedence) 
      VALUES($1, $2, $3)
      RETURNING 
      id,
      email,
      phone_number AS "phoneNumber"
    `,
      values: [user.phoneNumber, user.email, "primary"],
    };
    const res = await client.query(query);
    return res.rows[0] as Contact;
  }

  async insertSecondaryContact(user: User, linkedId: number) {
    const query = {
      text: `
      INSERT INTO public.contacts (phone_number, email, linked_id, link_precedence)
      VALUES ($1, $2, $3, $4)
    `,
      values: [user.phoneNumber, user.email, linkedId, "secondary"],
    };

    await client.query(query);
  }

  async updatePrimaryContact(
    oldestPrimaryId: number,
    newestPrimaryId: number
  ): Promise<void> {
    const query = {
      text: `
			UPDATE public.contacts
			SET linked_id = $1,
					link_precedence = 'secondary',
					updated_at = CURRENT_TIMESTAMP
			WHERE id = $2
		`,
      values: [oldestPrimaryId, newestPrimaryId],
    };
    await client.query(query);
  }

  async updateSecondaryContact(
    oldestPrimaryId: number,
    newestPrimaryId: number
  ): Promise<void> {
    const query = {
      text: `
      UPDATE public.contacts
      SET linked_id = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE linked_id = $2
    `,
      values: [oldestPrimaryId, newestPrimaryId],
    };

    await client.query(query);
  }

  async getSecondaryContacts(
    primaryContactId: number
  ): Promise<SecondaryContacts[]> {
    const query = {
      text: `
        SELECT 
        id, 
        email, 
        phone_number AS "phoneNumber"
        FROM public.contacts 
        WHERE linked_id = $1
    `,
      values: [primaryContactId],
    };
    const res = await client.query(query);
    return res.rows as SecondaryContacts[];
  }

  async fetchContactDetails(id: number): Promise<Contact> {
    const query = {
      text: `
        SELECT 
        id, 
        phone_number AS "phoneNumber", 
        email, 
        linked_id AS "linkedId", 
        link_precedence AS "linkPrecedence", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt", 
        deleted_at as "deletedAt" 
				FROM public.contacts 
				WHERE id = $1
    `,
      values: [id],
    };
    const res = await client.query(query);
    return res.rows[0] as Contact;
  }
}
