/**
 * Seeds the Spring Boot (Java) backend with the mock data from db.json.
 *
 * Fleet only: it clears existing routes + vehicles, recreates the vehicles
 * (capturing the new auto-increment ids), then recreates each route together
 * with its driver/students (Assignment) and its stops.
 *
 * Requirements: the Java back must be running on :8080. Run with:
 *     node server/seed-java-from-dbjson.mjs
 * Override the base URL with:  JAVA_API=http://host:port/api/v1 node ...
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.JAVA_API ?? 'http://localhost:8080/api/v1';
const ORG = 1;
const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8'));

// The backend RouteType vocabulary is OUTBOUND / INBOUND; db.json (front) uses RETURN for inbound.
const toBackendType = (t) => (t === 'RETURN' || t === 'INBOUND') ? 'INBOUND' : 'OUTBOUND';

async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${text}`);
  return data;
}

async function main() {
  console.log('Seeding Java backend at', BASE, '\n');

  // 1) Clear existing trips (incl. stale ones with a bogus driverId), then routes
  //    (cascades stops + assignment), then vehicles.
  const oldTrips = await req('GET', `${BASE}/trips?organizationId=${ORG}`).catch(() => []);
  for (const t of oldTrips ?? []) {
    try { await req('DELETE', `${BASE}/trips/${t.id}`); console.log('  - deleted trip', t.id); }
    catch (e) { console.log('  (could not delete trip', t.id + ':', e.message, ')'); }
  }
  const routes = await req('GET', `${BASE}/routes?organizationId=${ORG}`).catch(() => []);
  for (const r of routes ?? []) { await req('DELETE', `${BASE}/routes/${r.id}`); console.log('  - deleted route', r.id); }
  const vehicles = await req('GET', `${BASE}/vehicles?organizationId=${ORG}`).catch(() => []);
  for (const v of vehicles ?? []) {
    try { await req('DELETE', `${BASE}/vehicles/${v.id}`); console.log('  - deleted vehicle', v.id); }
    catch (e) { console.log('  (could not delete vehicle', v.id + ':', e.message, ')'); }
  }

  // 2) Seed vehicles -> map db.json id to the new backend id.
  const vehMap = {};
  for (const v of db.vehicles ?? []) {
    const c = await req('POST', `${BASE}/vehicles`, {
      organizationId: v.organizationId ?? ORG, plate: v.plate, model: v.model,
      capacity: v.capacity, status: v.status ?? 'ACTIVE'
    });
    vehMap[v.id] = c.id;
    console.log(`  + vehicle ${v.plate}  (db ${v.id} -> java ${c.id})`);
  }

  // 3) Seed routes (driver + students via Assignment) then their stops.
  const routeMap = {};
  for (const r of db.routes ?? []) {
    const c = await req('POST', `${BASE}/routes`, {
      name: r.name,
      type: toBackendType(r.type),
      status: r.status ?? 'ACTIVE',
      scheduledStartTime: r.scheduledStartTime ?? null,
      organizationId: r.organizationId ?? ORG,
      vehicleId: r.vehicleId != null ? (vehMap[r.vehicleId] ?? null) : null,
      driverId: r.driverId ?? null,
      studentIds: r.studentIds ?? []
    });
    routeMap[r.id] = c.id;
    console.log(`  + route "${r.name}"  (db ${r.id} -> java ${c.id})  driver=${r.driverId ?? '-'} students=${(r.studentIds || []).length}`);

    const stops = (r.waypoints ?? []).map((w, i) => ({
      name: w.name ?? `Parada ${i + 1}`, latitude: w.lat, longitude: w.lng, stopOrder: w.order ?? (i + 1)
    }));
    if (stops.length) { await req('PUT', `${BASE}/routes/${c.id}/stops`, stops); console.log(`        ${stops.length} stops set`); }
  }

  // 4) Seed trips so each driver has trips to see. The backend has no SCHEDULED
  //    state (start = IN_PROGRESS/EN_ROUTE); the COMPLETED ones are completed after start.
  //    Trips with an invalid routeId (e.g. 0 in db.json) or no driver are skipped.
  for (const t of db.trips ?? []) {
    const routeId = routeMap[t.routeId];
    if (!routeId || !t.driverId) { console.log(`  (skip trip db ${t.id}: routeId ${t.routeId} not seeded / no driver)`); continue; }
    const created = await req('POST', `${BASE}/trips`, {
      organizationId: t.organizationId ?? ORG, routeId, driverId: t.driverId
    });
    let note = 'EN_ROUTE';
    if (t.status === 'COMPLETED') { await req('POST', `${BASE}/trips/${created.id}/completion`, {}); note = 'COMPLETED'; }
    console.log(`  + trip (db ${t.id} -> java ${created.id})  route=${routeId} driver=${t.driverId} -> ${note}`);
  }

  // 5) Verify.
  const finalRoutes = await req('GET', `${BASE}/routes?organizationId=${ORG}`);
  console.log('\nRoutes now in the backend:');
  for (const r of finalRoutes) {
    console.log(`  #${r.id} ${r.name} | driverId=${r.driverId ?? '-'} vehicleId=${r.vehicleId ?? '-'} plate=${r.vehiclePlate || '-'} students=${(r.studentIds || []).length}`);
  }
  const finalTrips = await req('GET', `${BASE}/trips?organizationId=${ORG}`);
  console.log('\nTrips now in the backend:');
  for (const t of finalTrips) {
    console.log(`  #${t.id} route=${t.routeId} driverId=${t.driverId} state=${t.tripState}`);
  }
  console.log('\nDone. A DRIVER only sees trips whose driverId == their user id.');
  console.log('Log in as: driver@saferoute.pe (Carlos, id 2) or ltorres@saferoute.pe (Luis, id 4).');
}

main().catch(e => { console.error('\nSEED FAILED:', e.message); process.exit(1); });
