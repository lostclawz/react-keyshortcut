import * as R from 'ramda';
import React from 'react';
import sinon from 'sinon';
import { expect } from 'chai';
import { mount } from 'enzyme';
import KeyShortcut, { modifierString } from '../KeyShortcut';

/**
 * Dispatch a fake keyboard event for testing purposes
 * @param {string} key
 * @param {object} modifiers
 */
export const fakeKeyEvent = (type = 'keydown') => (key, {
   ctrlKey = false,
   altKey = false,
   shiftKey = false,
   metaKey = false,
} = {}) => document.dispatchEvent(
   new KeyboardEvent(type, {
      key,
      code: key.charCodeAt(0),
      ctrlKey,
      shiftKey,
      altKey,
      metaKey,
   })
);

export const fakeKeyDown = fakeKeyEvent('keydown');
export const fakeKeyUp = fakeKeyEvent('keyup');


describe('KeyShortcut', () => {
   let wrapper;

   afterEach(() => {
      sinon.restore();
      // unmount to fire effect hooks
      try {
         wrapper.unmount();
      }
      catch (e) {
         // may have unmounting in test itself
      }
   });

   it('registers a global keyboard event listener', () => {
      const k = 'p';
      const callback = sinon.fake();
      wrapper = mount(
         <KeyShortcut action={callback} k={k} />
      );
      const kd = fakeKeyDown(k, {});
      expect(kd).to.be.true;
      expect(callback.calledOnce).to.be.true;
   });

   it('doesn\'t fire callbacks added in the past if propagation is stopped', () => {
      const k = 'p';
      const callback = sinon.fake();
      wrapper = mount(
         <KeyShortcut
            k={k}
            action={callback}
         />
      );

      const callback2 = sinon.fake();
      const wrapper2 = mount(
         <KeyShortcut
            action={callback2}
            k={k}
            stopPropagation
         />
      );
      fakeKeyDown(k, {});
      expect(callback2.calledOnce).to.be.true;
      expect(callback.calledOnce).to.be.false;

      wrapper2.unmount();
   });

   it('removes listener on unmount', () => {
      const k = 'p';
      const callback = sinon.fake();
      wrapper = mount(
         <KeyShortcut
            k={k}
            action={callback}
         />
      );
      wrapper.unmount();
      fakeKeyDown(k, {});
      expect(callback.calledOnce).to.be.false;
   });

   const k = 'p';
   ['alt', 'shift', 'ctrl', 'meta'].forEach((mod) => {
      it(`takes modifier key ${mod} into account`, () => {
         const callback = sinon.fake();
         wrapper = mount(
            <KeyShortcut
               k={k}
               action={callback}
               {...{ [mod]: true }}
            />
         );
         // no modifier
         fakeKeyDown(k, { });
         expect(callback.calledOnce).to.be.false;

         // with modifier
         fakeKeyDown(k, { [`${mod}Key`]: true });
         expect(callback.calledOnce).to.be.true;

         wrapper.unmount();
      });
   });

   it('works with multiple modifiers', () => {
      const callback = sinon.fake();
      wrapper = mount(
         <KeyShortcut
            k={k}
            action={callback}
            alt
            ctrl
         />
      );
      fakeKeyDown(k, { altKey: true });
      expect(callback.calledOnce).to.be.false;
      fakeKeyDown(k, { altKey: true, shiftKey: true });
      expect(callback.calledOnce).to.be.false;
      fakeKeyDown(k, { ctrlKey: true, altKey: true });
      expect(callback.calledOnce).to.be.true;
   });

   describe('Logging functionality', () => {
      it('has a modifierString logging tool', () => {
         expect(modifierString({
            ctrlKey: true,
         })).to.equal('ctrl');
         expect(modifierString({
            ctrlKey: false,
            altKey: true,
         })).to.equal('alt');
      });
   
      it('logs a message to the console when log prop is true', () => {
         const log = sinon.fake();
         sinon.replace(console, 'log', log);
         wrapper = mount(
            <KeyShortcut alt k="c" action={R.identity} log />
         );
         fakeKeyDown('c', { altKey: true });
         expect(log.callCount).to.equal(1);
      });
   
      it('does not log more than once if more than one component is rendered with log', () => {
         const log = sinon.fake();
         sinon.replace(console, 'log', log);
         wrapper = mount(
            <>
               <KeyShortcut alt k="c" action={R.identity} log />
               <KeyShortcut ctrl k="x" action={R.identity} log />
            </>
         );
         fakeKeyDown('c', { altKey: true });
         expect(log.callCount).to.equal(1);
      });
   
      it('logs all key presses, even those not being listened to', () => {
         const log = sinon.fake();
         sinon.replace(console, 'log', log);
         wrapper = mount(
            <KeyShortcut alt k="c" action={R.identity} log />
         );
         fakeKeyDown('z');
         expect(log.callCount).to.equal(1);
      });

      it('logs the label property as first argument, when available', () => {
         const log = sinon.fake();
         
         sinon.replace(console, 'log', log);
         wrapper = mount(
            <KeyShortcut label="test" k="c" action={R.identity} log />
         );
         fakeKeyDown('c');
         // log.lastCall.
         expect(R.head(log.lastCall.args)).to.equal('%ctest');
      });
      
      it('tries to use the name of the called function if label is not given', () => {
         const log = sinon.fake();
         const testFunc = () => {};
         sinon.replace(console, 'log', log);
         wrapper = mount(
            <KeyShortcut k="c" action={testFunc} log />
         );
         fakeKeyDown('c');
         // log.lastCall.
         expect(R.head(log.lastCall.args)).to.equal('%ctestFunc');
      })
   })
});
