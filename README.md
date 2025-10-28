# TicketApp — Twig Implementation

This is the **Twig (PHP)** implementation of the Multi-Framework Ticket Web App.

## Features
- Landing page with wave hero + decorative circles
- Login / Signup screens with validation and toasts
- Protected Dashboard and Ticket Management screens
- Full ticket CRUD stored in `localStorage` (`ticketapp_tickets`)
- Session saved under `localStorage` key `ticketapp_session` (and a cookie of same name for server-side guard)
- Validation rules:
  - `title` and `status` are required
  - `status` only accepts: `open`, `in_progress`, `closed`
- Accessible HTML (semantic tags, focus states)

## Tech
- PHP + Twig
- Vanilla JS for auth & business logic
- CSS for styling

## Setup
1. Install dependencies:
   ```bash
   composer install
