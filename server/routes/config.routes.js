import { Router } from 'express';
import {
    getTipoIdentificacion,
    getPaises,
    getDepartamentos,
    getCiudades,
    getEPS,
    getPension,
    getEstadoCivil,
} from '../controllers/config.controller.js';

const router = Router();

router.get('/tipo-identificacion', getTipoIdentificacion);
router.get('/paises', getPaises);
router.get('/departamentos', getDepartamentos);
router.get('/ciudades', getCiudades);
router.get('/eps', getEPS);
router.get('/pension', getPension);
router.get('/estado-civil', getEstadoCivil);

export default router;
