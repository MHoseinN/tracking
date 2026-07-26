# Project Guide

## Stack
- Frontend: Vue 3.3.4, Vite 4.4.9, JavaScript, Pinia, Vue Router, Tailwind CSS, Axios.
- Backend: Node/Express project in `backend/`.
- Package scripts are defined in `frontend/package.json`.

## Common Commands
- Install frontend dependencies: `cd frontend && npm install`
- Run development server: `cd frontend && npm run dev`
- Build frontend: `cd frontend && npm run build`
- Preview production build: `cd frontend && npm run preview`
- Lint: no lint script is currently defined.
- Test: no frontend test script is currently defined.

## Current Frontend Structure
- `frontend/src/main.js`: Vue app bootstrap and Pinia registration.
- `frontend/src/router.js`: Vue Router route table and auth guard.
- `frontend/src/pages`: app-level pages and layout shell.
- `frontend/src/components`: current shared components and route components.
- `frontend/src/stores`: Pinia stores for auth, invoices, inventory, and reservation cart.
- `frontend/src/utils`: shared API client, date conversion, status styles, and export helpers.
- `frontend/src/composables`: shared Composition API logic extracted during refactor.
- `frontend/src/composables/usePermissions.js`: centralized optional role/permission checks for route metadata and UI.
- `frontend/src/composables/useInventoryGroups.js`: inventory unit filtering, descendant-category matching, and product grouping.
- `frontend/src/composables/useInventoryUnitActions.js`: direct reservation, release/undo, modal state, and reservation-cart actions.
- `frontend/src/composables/useReservationReleaseActions.js`: single-order and release-all reservation workflows with confirmation and undo.
- `frontend/src/composables/useReservationOrderEditor.js`: reservation editor state, lookup loading, save workflow, and edit undo.
- `frontend/src/composables/useReservationItemChanges.js`: grouped reservation-item payloads, quantity/delete mutations, validation, loading, and undo.
- `frontend/src/composables/useCustomerInvoiceList.js`: customer invoice date/status filtering and stable sorting.
- `frontend/src/composables/useCustomerInvoiceActions.js`: customer invoice modal state, create/edit/delete, status change, and undo workflows.
- `frontend/src/composables/useCustomerProfileForm.js`: customer profile/notes drafts, validation, change detection, and save workflow.
- `frontend/src/composables/useProductCatalogActions.js`: category/product modal state, create/edit/delete workflows, and undo actions.
- `frontend/src/composables/useUserManagementActions.js`: customer modal state, account-status updates, delete/restore workflows, and undo actions.
- `frontend/src/modules`: feature API services (`auth`, `inventory`, `invoices`, `system`); stores remain in `src/stores` for compatibility.
- Inventory-specific reusable UI belongs in `frontend/src/components/inventory`; customer summary/profile UI belongs in `frontend/src/components/customers`.
- `InventoryProductGroup.vue` owns product/unit presentation and emits reservation, cart, release, and accordion events to its route.
- `InventoryReservationOrderCard.vue` and `InventoryReservationItemsTable.vue` own active-reservation presentation and emit edit/release/quantity/remove events.
- `ProductCatalogSidebar.vue` and `ProductCatalogList.vue` own product-category navigation and product-list presentation under `frontend/src/components/products`.
- `frontend/src/utils/apiError.js`: shared API error-message normalization.
- `frontend/src/utils/actionResult.js`: shared mutation result wrapper for predictable `{ success, data, message }` responses.

## Naming And Placement
- Route-level components currently use the `*Route.vue` suffix.
- Shared UI components use the `App*` prefix when they are generic across features.
- Keep feature-specific components near their feature until a broader module structure is introduced.
- API service files use the `<feature>.service.js` convention and expose named methods such as `getInvoices` or `createProduct`.
- Do not create empty module folders. Move toward feature-based folders only when files are actually moved and imports are updated.

## Component Rules
- Pass data down with props and send changes up with emits.
- Keep modal open/close state local unless more than one unrelated page needs it.
- Extract only repeated UI that has the same responsibility and similar behavior.
- Avoid large generic components with many unrelated props.

## Composable Rules
- Put reusable business or workflow logic in `frontend/src/composables`.
- Keep visual-only state inside the component.
- Prefer small composables with one clear purpose, such as pagination, undo actions, search normalization, and tree filtering.

## API Rules
- Use `frontend/src/utils/api.js` for Axios configuration.
- Do not repeat base URL, token headers, or raw Axios setup in components.
- Prefer moving endpoint calls from route components into stores or feature services.
- Keep backend endpoint names, payloads, and response contracts unchanged unless explicitly coordinated.
- Normalize user-facing API errors through `getApiErrorMessage`; do not duplicate response-message mapping in components.

## Forms, State, and Access

- Pinia stores contain cross-page data and server mutations; modal and form draft state stays local to components/composables.
- Route guards in `frontend/src/router.js` protect authenticated pages. Backend authorization remains authoritative.
- There is currently no lint or test script; `npm run build` is the required regression check after refactors.

## Constraints
- Do not convert the project to TypeScript.
- Do not upgrade Vue, Vite, or core libraries without a concrete compatibility reason.
- Do not change UI appearance during refactor unless fixing a real bug.
- Do not refactor generated output, dependency folders, or build artifacts.
- Do not hard-code secrets, tokens, or private configuration.
- Do not change endpoint paths, request payloads, response contracts, or authentication persistence without coordination.
