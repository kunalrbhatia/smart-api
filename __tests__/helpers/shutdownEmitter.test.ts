import { shutdownEmitter } from '../../src/helpers/shutdownEmitter';
import { EventEmitter } from 'events';

describe('shutdownEmitter', () => {
  it('should be an instance of EventEmitter', () => {
    expect(shutdownEmitter).toBeInstanceOf(EventEmitter);
  });

  it('should allow registering and triggering trigger events', () => {
    const callback = jest.fn();
    shutdownEmitter.on('trigger', callback);

    shutdownEmitter.emit('trigger');
    expect(callback).toHaveBeenCalledTimes(1);

    // Clean up
    shutdownEmitter.off('trigger', callback);
  });
});
