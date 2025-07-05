# Identity Reconciliation

An API to reconcile user identity based on `email` and/or `phoneNumber` using contact precedence logic. Helps deduplicate contact information and return a unified contact trail.

---

## Reconciliation Scenarios

![Reconciliation Scenarios](https://raw.githubusercontent.com/kksahay/identify-reconciliation/465b620cd760e41bfbace83cb39d22dcdf1cd17a/static/Reconciliation%20Scenarios.png)

---

## API Documentation

**Swagger UI**: [https://identify-reconciliation-bvue.onrender.com/swagger/ui](https://identify-reconciliation-bvue.onrender.com/swagger/ui)

---

## Reconciliation Cases

### Case 0: Repeated phone and email is given

**No new data detected: Already present in the system**

- **Action**: Return existing primary and associated secondary contacts.

---

### Case 1: Both phone and email are unique

**Both new data detected: Primary contact has to be created**

- **Action**: Create a new `primary` contact record with the provided email and phone number.

---

### Case 2: Email exists but phone does not

**New data detected: Secondary contact has to be created**

#### Case 2A: Matched email is a primary contact

- **Action**: Create a `secondary` contact with provided phone, linking it to the existing `primary` via `linkedId`.

#### Case 2B: Matched email is a secondary contact

- **Action**: Create a `secondary` contact with provided phone, linking it to the **same primary** of the matched secondary.

---

### Case 3: Phone exists but email does not

**New data detected: Secondary contact has to be created**

#### Case 3A: Matched phone is a primary contact

- **Action**: Create a `secondary` contact with provided email, linking it to the existing `primary` via `linkedId`.

#### Case 3B: Matched phone is a secondary contact

- **Action**: Create a `secondary` contact with provided email, linking it to the **same primary** of the matched secondary.

---

### Case 4: Both phone and email exist

**No new data detected: Only linking/merging is required**

#### Case 4A: Both are secondary belonging to different primary contacts

- **Action**:
  - Choose the latest created contact as `newestPrimary`
  - Demote the other primary to secondary
  - Update all its linked records to point to `newestPrimary`
  - Return the contact trail

#### Case 4B: Both are secondary belonging to same primary contacts

- **Action**: Return the existing contact trail without changes.

#### Case 4C: Both are primary contacts

- **Action**:
  - Choose the latest created contact as `newestPrimary`
  - Demote the other primary to secondary
  - Update all its linked records
  - Return the contact trail

#### Case 4D: EmailContact is primary but PhoneContact is secondary

- **Action**:
  - Compare `createdAt` timestamps
  - Demote the older primary (if needed) and re-link all associated records
  - Return the contact trail

#### Case 4E: PhoneContact is primary but EmailContact is secondary

- **Action**:
  - Compare `createdAt` timestamps
  - Demote the older primary (if needed) and re-link all associated records
  - Return the contact trail

---

## API Endpoint

**POST** [`/api/identify`](https://identify-reconciliation-bvue.onrender.com/api/identify)

### Request

```json
{
  "phoneNumber": "9876543210",
  "email": "john@example.com"
}
```

> At least one of `phoneNumber` or `email` must be provided.

### Response

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["john@example.com", "alt@example.com"],
    "phoneNumbers": ["9876543210"],
    "secondaryContactIds": [2, 3]
  }
}
```

> The first element in `emails` and `phoneNumbers` is always from the `primary` contact.

---

## Structure Overview

```
├── src/
│   ├── controller/IdentifyController.ts
│   ├── routes/identifyRoute.ts
│   ├── routes/swaggerRoute.ts
│   ├── utils/queries/IdentifyQueries.ts
│   └── utils/types.ts
│   └── App.ts
│   └── server.ts
├── Dockerfile
├── package.json
├── .env
└── README.md
```
