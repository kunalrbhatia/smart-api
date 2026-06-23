import { EventEmitter } from 'events';

class ShutdownEmitter extends EventEmitter {}

export const shutdownEmitter = new ShutdownEmitter();
