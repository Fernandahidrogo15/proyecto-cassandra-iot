-- Creación del Keyspace
CREATE KEYSPACE iot_telemetria WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

-- Uso del Keyspace
USE iot_telemetria;

-- Creación de la tabla con llave primaria compuesta
CREATE TABLE lecturas_sensor (
    sensor_id uuid,
    fecha timestamp,
    ubicacion text,
    temperatura float,
    humedad float,
    PRIMARY KEY (sensor_id, fecha)
);

-- Consulta general de registros
SELECT * FROM lecturas_sensor;
