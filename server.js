const express = require('express');
const cassandra = require('cassandra-driver');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new cassandra.Client({
    contactPoints: ['127.0.0.1'],
    localDataCenter: 'datacenter1',
    keyspace: 'iot_telemetria'
});

client.connect()
    .then(() => console.log('Conectado exitosamente a Apache Cassandra'))
    .catch(err => console.error('Error al conectar a Cassandra', err));

app.get('/api/telemetria', async (req, res) => {
    try {
        const query = 'SELECT * FROM lecturas_sensor LIMIT 20';
        const result = await client.execute(query);
        const lecturas = result.rows;

        let filas = '';
        let modales = '';

        lecturas.forEach(l => {
            const idStr = l.sensor_id ? l.sensor_id.toString() : 'N/A';
            const fechaStr = l.fecha ? l.fecha.toLocaleString() : 'N/A';
            const fechaIso = l.fecha ? l.fecha.toISOString() : '';
            
            filas += `
            <tr>
                <td>${l.ubicacion || 'N/A'}</td>
                <td><a href="#" onclick="abrirModal('${idStr}')" style="color: #3498db; text-decoration: none; font-weight: bold;">${idStr}</a></td>
                <td>${l.temperatura} °C</td>
                <td>${l.humedad} %</td>
                <td>${fechaStr}</td>
                <td>
                    <button onclick="eliminarLectura('${idStr}', '${fechaIso}')" style="background-color: #e74c3c; padding: 5px 10px; color: white; border: none; border-radius: 4px; cursor: pointer;">Eliminar</button>
                </td>
            </tr>`;

            modales += `
            <div id="modal-${idStr}" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); justify-content:center; align-items:center;">
                <div style="background:white; padding:25px; border-radius:8px; width:350px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                    <h3 style="color:#2c3e50; margin-top:0;">Detalle del Sensor IoT</h3>
                    <p><strong>Sensor ID:</strong> ${idStr}</p>
                    <p><strong>Ubicación:</strong> ${l.ubicacion}</p>
                    <p><strong>Temperatura:</strong> ${l.temperatura} °C</p>
                    <p><strong>Humedad:</strong> ${l.humedad} %</p>
                    <p><strong>Fecha/Hora:</strong> ${fechaStr}</p>
                    <button onclick="cerrarModal('${idStr}')" style="background-color: #95a5a6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; width: 100%;">Cerrar</button>
                </div>
            </div>`;
        });

        const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Dashboard IoT - Cassandra</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; background-color: #f4f4f9; color: #333; }
                h2 { color: #2c3e50; }
                form { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); width: 350px; margin-bottom: 20px; }
                label { display: block; margin-bottom: 6px; font-weight: bold; }
                input[type="text"], input[type="number"] { width: 100%; padding: 8px; margin-bottom: 12px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
                button.btn-guardar { background-color: #27ae60; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; width: 100%; }
                button.btn-guardar:hover { background-color: #219653; }
                table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #2c3e50; color: white; }
            </style>
        </head>
        <body>
            <h2>Registro de Telemetría IoT (Cassandra)</h2>
            <form action="/api/telemetria" method="POST">
                <label for="ubicacion">Ubicación:</label>
                <input type="text" id="ubicacion" name="ubicacion" required placeholder="Ej. Planta Alta - Zona A">

                <label for="temperatura">Temperatura (°C):</label>
                <input type="number" step="0.1" id="temperatura" name="temperatura" required placeholder="Ej. 25.5">

                <label for="humedad">Humedad (%):</label>
                <input type="number" step="0.1" id="humedad" name="humedad" required placeholder="Ej. 60.0">

                <button type="submit" class="btn-guardar">Registrar Lectura</button>
            </form>

            <h2>Panel de Lecturas Recientes</h2>
            <table>
                <thead>
                    <tr>
                        <th>Ubicación</th>
                        <th>Sensor ID (Ver Detalles)</th>
                        <th>Temperatura</th>
                        <th>Humedad</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>

            ${modales}

            <script>
                function abrirModal(id) {
                    document.getElementById('modal-' + id).style.display = 'flex';
                }
                function cerrarModal(id) {
                    document.getElementById('modal-' + id).style.display = 'none';
                }
                async function eliminarLectura(sensorId, fecha) {
                    if (confirm('¿Estás seguro de eliminar esta lectura?')) {
                        const respuesta = await fetch('/api/telemetria/' + sensorId + '/' + fecha, { method: 'DELETE' });
                        if (respuesta.ok) {
                            window.location.reload();
                        } else {
                            alert('Error al eliminar la lectura');
                        }
                    }
                }
            </script>
        </body>
        </html>
        `;
        res.send(html);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al cargar los datos de Cassandra");
    }
});

app.post('/api/telemetria', async (req, res) => {
    try {
        const { ubicacion, temperatura, humedad } = req.body;
        const sensorId = cassandra.types.Uuid.random(); // Genera un UUID válido automáticamente
        const query = 'INSERT INTO lecturas_sensor (sensor_id, fecha, ubicacion, temperatura, humedad) VALUES (?, toTimestamp(now()), ?, ?, ?)';
        const params = [sensorId, ubicacion, parseFloat(temperatura), parseFloat(humedad)];
        
        await client.execute(query, params, { prepare: true });
        res.redirect('/api/telemetria');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al insertar la lectura");
    }
});

app.delete('/api/telemetria/:sensor_id/:fecha', async (req, res) => {
    try {
        const { sensor_id, fecha } = req.params;
        const query = 'DELETE FROM lecturas_sensor WHERE sensor_id = ? AND fecha = ?';
        await client.execute(query, [sensor_id, fecha], { prepare: true });
        res.json({ mensaje: 'Eliminado con éxito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${port}/api/telemetria`);
});
