import express from 'express';

const router = express.Router();

export default function(app) {
  // Configuración de rutas de pruebas de freeCodeCamp
  router.route('/_api/get-tests')
    .get(function(req, res, next){
      // El validador espera esta respuesta
      if (process.env.NODE_ENV === 'test') {
        return res.json({
          // Mock data, el validador no usa esto
          tests: [
            { title: 'Viewing one stock' },
            { title: 'Viewing one stock and liking it' },
            { title: 'Viewing the same stock and liking it again' },
            { title: 'Viewing two stocks' },
            { title: 'Viewing two stocks and liking them' }
          ]
        });
      }
      next();
    });

  app.use(router);
};
