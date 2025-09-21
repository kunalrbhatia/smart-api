import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import createHttpError from 'http-errors';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

/**
 * The express application.
 * @type {Application}
 */
const app: Application = express();

app.use(bodyParser.json());
app.use(cors());

// Routes
app.use('/', routes);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});

// Error handler
app.use(errorHandler);

export default app;
