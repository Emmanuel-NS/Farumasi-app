# FARUMASI MVP portals

## Included in launch

| Portal | Directory | Typical port |
|--------|-------------|--------------|
| API | `farumasi_api` | 8000 |
| Patient | `farumasi_patient_portal` | 3001 |
| Pharmacist | `farumasi_pharmacist_portal` | 3002 |
| Rider | `farumasi_rider_portal` | 3003 |
| Partner | `farumasi_partner_portal` | 3004 |
| Super Admin | `farumasi_super_admin` | 3005 |

## Excluded from launch

These portals remain in the repo for future work but are **blocked by default** via Next.js middleware:

| Portal | Directory | Enable locally |
|--------|-------------|----------------|
| Doctor | `farumasi_doctor_portal` | `NEXT_PUBLIC_MVP_PORTAL_ENABLED=true` |
| Hospital | `farumasi_hospital_portal` | `NEXT_PUBLIC_MVP_PORTAL_ENABLED=true` |

Do not deploy doctor or hospital portals to production until they are wired to live APIs and removed from the MVP exclusion list.
