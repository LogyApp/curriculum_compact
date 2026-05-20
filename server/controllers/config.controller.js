/**
 * Config Controller
 * All /api/config/* endpoints use in-memory caching (10 min TTL).
 * Config tables (tipos, departamentos, EPS, etc.) are essentially static,
 * so caching eliminates the majority of DB queries under high concurrency.
 */

import { query } from '../config/database.js';
import { cachedGet } from '../utils/cache.js';

const TTL = 10 * 60 * 1000; // 10 minutes

export async function getTipoIdentificacion(req, res) {
    try {
        const data = await cachedGet(
            'tipo-identificacion',
            () => query('SELECT `Descripción` AS descripcion FROM Config_Tipo_Identificación ORDER BY `Descripción`'),
            TTL
        );
        res.json(data);
    } catch (err) {
        console.error('[config] getTipoIdentificacion:', err.message);
        res.status(500).json({ error: 'Error cargando tipos de identificación' });
    }
}

export async function getDepartamentos(req, res) {
    try {
        const data = await cachedGet(
            'departamentos',
            () => query("SELECT `Departamento` AS departamento FROM Config_Departamentos WHERE `País` = 'Colombia' ORDER BY `Departamento`"),
            TTL
        );
        res.json(data);
    } catch (err) {
        console.error('[config] getDepartamentos:', err.message);
        res.status(500).json({ error: 'Error cargando departamentos' });
    }
}

export async function getCiudades(req, res) {
    const { departamento } = req.query;
    if (!departamento) return res.status(400).json({ error: 'Parámetro departamento requerido' });
    try {
        const data = await cachedGet(
            `ciudades:${departamento}`,
            () => query("SELECT `Ciudad` AS ciudad FROM Config_Ciudades WHERE `Departamento` = ? AND `Pais` = 'Colombia' ORDER BY `Ciudad`", [departamento]),
            TTL
        );
        res.json(data);
    } catch (err) {
        console.error('[config] getCiudades:', err.message);
        res.status(500).json({ error: 'Error cargando ciudades' });
    }
}

export async function getEPS(req, res) {
    try {
        const data = await cachedGet(
            'eps',
            () => query('SELECT `EPS` AS eps FROM Config_EPS ORDER BY `EPS`'),
            TTL
        );
        res.json(data);
    } catch (err) {
        console.error('[config] getEPS:', err.message);
        res.status(500).json({ error: 'Error cargando EPS' });
    }
}

export async function getPension(req, res) {
    try {
        const data = await cachedGet(
            'pension',
            () => query('SELECT `Fondo de Pensión` AS pension FROM Config_Pensión ORDER BY `Fondo de Pensión`'),
            TTL
        );
        res.json(data);
    } catch (err) {
        console.error('[config] getPension:', err.message);
        res.status(500).json({ error: 'Error cargando fondos de pensión' });
    }
}

export async function getEstadoCivil(req, res) {
    try {
        const data = await cachedGet(
            'estado-civil',
            () => query("SELECT `Condición` AS estado_civil FROM Config_Estado_Civil ORDER BY `Condición`"),
            TTL
        );
        res.json(data);
    } catch (err) {
        console.error('[config] getEstadoCivil:', err.message);
        res.status(500).json({ error: 'Error cargando estados civiles' });
    }
}
