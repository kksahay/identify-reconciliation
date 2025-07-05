import type { Context } from "hono";
import {
  ContactTrail,
  ReconciliationResponse,
  SecondaryContacts,
  User,
} from "../utils/types";
import { IdentifyQueries } from "../utils/queries/IdentifyQueries";

export class IdentifyController {
  private readonly identifyQueries: IdentifyQueries;

  constructor() {
    this.identifyQueries = new IdentifyQueries();
  }
  async identify(c: Context) {
    try {
      const user = new User(await c.req.json());
      if (!user.email && !user.phoneNumber) {
        throw new Error("Please provide email or phoneNumber");
      }
      const response = new ReconciliationResponse();
      const contactTrail = new ContactTrail();

      const [emailContact, phoneContact, checkRepeat] = await Promise.all([
        this.identifyQueries.checkEmail(user),
        this.identifyQueries.checkPhone(user),
        await this.identifyQueries.checkRepeat(user),
      ]);

      //Case 0: Repeat data
      if (checkRepeat) {
        const primaryId =
          checkRepeat.linkPrecedence === "primary"
            ? checkRepeat.id
            : checkRepeat.linkedId!;

        const primary =
          checkRepeat.linkPrecedence === "primary"
            ? checkRepeat
            : await this.identifyQueries.fetchContactDetails(primaryId);

        const secondaryContacts =
          await this.identifyQueries.getSecondaryContacts(primaryId);

        contactTrail.primaryContactId = primary.id;
        contactTrail.emails.push(primary.email!);
        contactTrail.phoneNumbers.push(primary.phoneNumber!);

        this.populateSecondaryContacts(contactTrail, secondaryContacts);

        contactTrail.emails = [...new Set(contactTrail.emails)];
        contactTrail.phoneNumbers = [...new Set(contactTrail.phoneNumbers)];
        response.contact = contactTrail;
        return c.json(response, 200);
      }

      //Case 1: No match at all -> primary contact required
      if (!phoneContact && !emailContact) {
        const newPrimary = await this.identifyQueries.insertPrimaryContact(
          user
        );
        contactTrail.primaryContactId = newPrimary.id;
        contactTrail.emails.push(newPrimary.email!);
        contactTrail.phoneNumbers.push(newPrimary.phoneNumber!);
        response.contact = contactTrail;
        return c.json(response, 200);
      }

      //Case 2: Email matched -> secondary contact required
      if (!phoneContact && emailContact) {
        //Case2A: Matched email is primary contact

        if (emailContact.linkPrecedence === "primary") {
          await this.identifyQueries.insertSecondaryContact(
            user,
            emailContact.id
          );

          const secondaryContacts =
            await this.identifyQueries.getSecondaryContacts(emailContact.id);

          contactTrail.primaryContactId = emailContact.id;
          contactTrail.emails.push(emailContact.email!);

          this.populateSecondaryContacts(contactTrail, secondaryContacts);
        }

        //Case2B: Matched email is secondary contact
        else if (emailContact.linkPrecedence === "secondary") {
          await this.identifyQueries.insertSecondaryContact(
            user,
            emailContact.linkedId!
          );

          const primary2 = await this.identifyQueries.fetchContactDetails(
            emailContact.linkedId!
          );
          contactTrail.primaryContactId = primary2.id;
          contactTrail.emails.push(primary2.email!);
          const secondaryContacts =
            await this.identifyQueries.getSecondaryContacts(primary2.id);

          this.populateSecondaryContacts(contactTrail, secondaryContacts);
        }

        contactTrail.emails = [...new Set(contactTrail.emails)];
        contactTrail.phoneNumbers = [...new Set(contactTrail.phoneNumbers)];
        response.contact = contactTrail;
        return c.json(response, 200);
      }

      //Case 3: Phone matched -> secondary contact required

      if (phoneContact && !emailContact) {
        //Case3A: Matched phone is primary contact

        if (phoneContact.linkPrecedence === "primary") {
          await this.identifyQueries.insertSecondaryContact(
            user,
            phoneContact.id
          );

          const secondaryContacts =
            await this.identifyQueries.getSecondaryContacts(phoneContact.id);

          contactTrail.primaryContactId = phoneContact.id;
          contactTrail.emails.push(phoneContact.email!);

          this.populateSecondaryContacts(contactTrail, secondaryContacts);
        }

        //Case3B: Matched phone is secondary contact
        else if (phoneContact.linkPrecedence === "secondary") {
          await this.identifyQueries.insertSecondaryContact(
            user,
            phoneContact.linkedId!
          );

          const primary2 = await this.identifyQueries.fetchContactDetails(
            phoneContact.linkedId!
          );
          contactTrail.primaryContactId = primary2.id;
          contactTrail.emails.push(primary2.email!);
          const secondaryContacts =
            await this.identifyQueries.getSecondaryContacts(primary2.id);

          this.populateSecondaryContacts(contactTrail, secondaryContacts);
        }
        contactTrail.emails = [...new Set(contactTrail.emails)];
        contactTrail.phoneNumbers = [...new Set(contactTrail.phoneNumbers)];
        response.contact = contactTrail;
        return c.json(response, 200);
      }

      //Case 4: No new information detected -> secondary contact not required

      if (phoneContact && emailContact) {
        //Case4A: both are secondary belonging to different primary contacts

        if (
          phoneContact.linkPrecedence === "secondary" &&
          emailContact.linkPrecedence === "secondary" &&
          phoneContact.linkedId !== emailContact.linkedId
        ) {
          const primary1 = await this.identifyQueries.fetchContactDetails(
            phoneContact.linkedId!
          );
          const primary2 = await this.identifyQueries.fetchContactDetails(
            emailContact.linkedId!
          );
          const newestPrimaryId =
            primary1.createdAt > primary2.createdAt ? primary1.id : primary2.id;

          const oldestPrimaryId =
            primary1.createdAt < primary2.createdAt ? primary1.id : primary2.id;
          await this.identifyQueries.updatePrimaryContact(
            oldestPrimaryId,
            newestPrimaryId
          );
          await this.identifyQueries.updateSecondaryContact(
            oldestPrimaryId,
            newestPrimaryId
          );

          const oldestEmail =
            primary1.createdAt < primary2.createdAt
              ? primary1.email
              : primary2.email;

          contactTrail.primaryContactId = oldestPrimaryId;
          contactTrail.emails.push(oldestEmail!);

          const secondaryContacts =
            await this.identifyQueries.getSecondaryContacts(oldestPrimaryId);

          this.populateSecondaryContacts(contactTrail, secondaryContacts);
        }

        //Case4B: both are secondary belonging to same primary contacts
        else if (
          phoneContact.linkPrecedence === "secondary" &&
          emailContact.linkPrecedence === "secondary" &&
          phoneContact.linkedId === emailContact.linkedId
        ) {
          const primary1 = await this.identifyQueries.fetchContactDetails(
            phoneContact.linkedId!
          );

          const secondaryContacts =
            await this.identifyQueries.getSecondaryContacts(primary1.id!);

          contactTrail.primaryContactId = primary1.id;
          contactTrail.emails.push(primary1.email!);

          this.populateSecondaryContacts(contactTrail, secondaryContacts);
        }

        //Case4C: both are primary contacts
        else if (
          phoneContact.linkPrecedence === "primary" &&
          emailContact.linkPrecedence === "primary"
        ) {
          const newestPrimaryId =
            phoneContact.createdAt > emailContact.createdAt
              ? phoneContact.id
              : emailContact.id;

          const oldestPrimaryId =
            phoneContact.createdAt < emailContact.createdAt
              ? phoneContact.id
              : emailContact.id;

          const oldestEmail =
            phoneContact.createdAt < emailContact.createdAt
              ? phoneContact.email
              : emailContact.email;

          await this.identifyQueries.updatePrimaryContact(
            oldestPrimaryId,
            newestPrimaryId
          );

          contactTrail.primaryContactId = oldestPrimaryId;
          contactTrail.emails.push(oldestEmail!);

          const secondaryContacts =
            await this.identifyQueries.getSecondaryContacts(oldestPrimaryId);

          this.populateSecondaryContacts(contactTrail, secondaryContacts);
        }

        //case4D: emailContact is primary, phoneContact is secondary
        else if (
          emailContact.linkPrecedence === "primary" &&
          phoneContact.linkPrecedence === "secondary"
        ) {
          const primary1 = await this.identifyQueries.fetchContactDetails(
            phoneContact.linkedId!
          );

          const newestPrimaryId =
            primary1.createdAt > emailContact.createdAt
              ? primary1.id
              : emailContact.id;

          const oldestPrimaryId =
            primary1.createdAt < emailContact.createdAt
              ? primary1.id
              : emailContact.id;
          const oldestEmail =
            primary1.createdAt < emailContact.createdAt
              ? primary1.email
              : emailContact.email;

          if (newestPrimaryId !== oldestPrimaryId) {
            await this.identifyQueries.updatePrimaryContact(
              oldestPrimaryId,
              newestPrimaryId
            );
            await this.identifyQueries.updateSecondaryContact(
              oldestPrimaryId,
              newestPrimaryId
            );
          }

          contactTrail.primaryContactId = oldestPrimaryId;
          contactTrail.emails.push(oldestEmail!);

          const secondaryContacts =
            await this.identifyQueries.getSecondaryContacts(oldestPrimaryId);

          this.populateSecondaryContacts(contactTrail, secondaryContacts);
        }

        //case4E: phoneContact is primary, emailContact is secondary
        else if (
          phoneContact.linkPrecedence === "primary" &&
          emailContact.linkPrecedence === "secondary"
        ) {
          const primary2 = await this.identifyQueries.fetchContactDetails(
            emailContact.linkedId!
          );

          const newestPrimaryId =
            phoneContact.createdAt > primary2.createdAt
              ? phoneContact.id
              : primary2.id;

          const oldestPrimaryId =
            phoneContact.createdAt < primary2.createdAt
              ? phoneContact.id
              : primary2.id;

          const oldestEmail =
            phoneContact.createdAt < primary2.createdAt
              ? phoneContact.email
              : primary2.email;

          if (newestPrimaryId !== oldestPrimaryId) {
            await this.identifyQueries.updatePrimaryContact(
              oldestPrimaryId,
              newestPrimaryId
            );
            await this.identifyQueries.updateSecondaryContact(
              oldestPrimaryId,
              newestPrimaryId
            );
          }

          contactTrail.primaryContactId = oldestPrimaryId;
          contactTrail.emails.push(oldestEmail!);

          const secondaryContacts =
            await this.identifyQueries.getSecondaryContacts(oldestPrimaryId);

          this.populateSecondaryContacts(contactTrail, secondaryContacts);
        }
        contactTrail.emails = [...new Set(contactTrail.emails)];
        contactTrail.phoneNumbers = [...new Set(contactTrail.phoneNumbers)];
        response.contact = contactTrail;
        return c.json(response, 200);
      }
    } catch (error: any) {
      return c.json(
        {
          error: error.message,
        },
        400
      );
    }
  }

  private populateSecondaryContacts(
    contactTrail: ContactTrail,
    secondaryContacts: SecondaryContacts[]
  ) {
    for (const contacts of secondaryContacts) {
      contactTrail.emails.push(contacts.email);
      contactTrail.phoneNumbers.push(contacts.phoneNumber);
      contactTrail.secondaryContactIds.push(contacts.id);
    }
  }
}
