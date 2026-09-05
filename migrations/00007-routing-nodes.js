// Ley runs migrations inside a transaction. Do not execute up/down outside one.
export async function up(sql) {
  await sql`LOCK TABLE routing_edges IN ACCESS EXCLUSIVE MODE`;
  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM routing_edges) THEN
        RAISE EXCEPTION 'Existing edges need a room-to-node mapping before migration. No changes applied.';
      END IF;
    END;
    $$
  `;

  await sql`
    CREATE TABLE routing_nodes (
      campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
      node_id TEXT NOT NULL,
      nid INTEGER NOT NULL CHECK (nid > 0),
      loc TEXT NOT NULL CHECK (length(trim(loc)) > 0),
      node_type TEXT NOT NULL CHECK (node_type IN ('junction', 'entrance', 'turn')),
      floor_id TEXT NOT NULL CHECK (length(trim(floor_id)) > 0),
      is_accessible BOOLEAN NOT NULL,
      geom GEOMETRY(Point, 4326) NOT NULL,
      PRIMARY KEY (campus_id, node_id),
      UNIQUE (campus_id, nid),
      CHECK (node_id ~ '^OUT_[A-Z0-9_]+_[^_]+_[0-9]{3,}$'),
      CHECK (
        NOT ST_IsEmpty(geom)
        AND ST_X(geom) BETWEEN -180 AND 180
        AND ST_Y(geom) BETWEEN -90 AND 90
      )
    )
  `;
  await sql`CREATE INDEX routing_nodes_geom_idx ON routing_nodes USING GIST (geom)`;

  await sql`
    ALTER TABLE routing_edges
      DROP CONSTRAINT routing_edges_source_node_id_fkey,
      DROP CONSTRAINT routing_edges_target_node_id_fkey
  `;
  await sql`
    ALTER TABLE routing_edges
      ADD COLUMN campus_id UUID NOT NULL REFERENCES campuses(id),
      ALTER COLUMN source_node_id TYPE TEXT USING source_node_id::text,
      ALTER COLUMN target_node_id TYPE TEXT USING target_node_id::text
  `;
  await sql`
    ALTER TABLE routing_edges
      ADD CONSTRAINT routing_edges_source_node_fkey
        FOREIGN KEY (campus_id, source_node_id)
        REFERENCES routing_nodes(campus_id, node_id) ON DELETE CASCADE,
      ADD CONSTRAINT routing_edges_target_node_fkey
        FOREIGN KEY (campus_id, target_node_id)
        REFERENCES routing_nodes(campus_id, node_id) ON DELETE CASCADE,
      ADD CONSTRAINT routing_edges_distance_check
        CHECK (distance_meters > 0 AND distance_meters < 'Infinity'::double precision)
  `;
  await sql`CREATE INDEX routing_edges_campus_id_idx ON routing_edges(campus_id)`;
}

export async function down(sql) {
  await sql`LOCK TABLE routing_edges, routing_nodes IN ACCESS EXCLUSIVE MODE`;
  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM routing_edges) OR EXISTS (SELECT 1 FROM routing_nodes) THEN
        RAISE EXCEPTION 'Cannot roll back populated routing tables. Map or export the data first.';
      END IF;
    END;
    $$
  `;
  await sql`
    ALTER TABLE routing_edges
      DROP CONSTRAINT routing_edges_source_node_fkey,
      DROP CONSTRAINT routing_edges_target_node_fkey,
      DROP CONSTRAINT routing_edges_distance_check,
      DROP COLUMN campus_id
  `;
  await sql`
    ALTER TABLE routing_edges
      ALTER COLUMN source_node_id TYPE UUID USING source_node_id::uuid,
      ALTER COLUMN target_node_id TYPE UUID USING target_node_id::uuid,
      ADD CONSTRAINT routing_edges_source_node_id_fkey
        FOREIGN KEY (source_node_id) REFERENCES rooms(id) ON DELETE CASCADE,
      ADD CONSTRAINT routing_edges_target_node_id_fkey
        FOREIGN KEY (target_node_id) REFERENCES rooms(id) ON DELETE CASCADE
  `;
  await sql`DROP TABLE routing_nodes`;
}

