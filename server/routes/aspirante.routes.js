import { Router } from 'express';
import multer from 'multer';
import {
    getAspirante,
    uploadPhoto,
    deleteFoto,
    registrarHV,
} from '../controllers/aspirante.controller.js';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const router = Router();

router.get('/aspirante', getAspirante);
router.post('/hv/registrar', registrarHV);
router.post('/hv/upload-photo', upload.single('photo'), uploadPhoto);
router.delete('/hv/foto/:identificacion', deleteFoto);

export default router;
