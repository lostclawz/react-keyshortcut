/* eslint-disable react/jsx-filename-extension */
import React from 'react';
import { fake } from 'sinon';
import { expect } from 'chai';
import { mount } from 'enzyme';
import KeyShortcut, { modString } from '../KeyShortcut';

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
}) => document.dispatchEvent(
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
      const callback = fake();
      wrapper = mount(
         <KeyShortcut action={callback} k={k} />
      );
      const kd = fakeKeyDown(k, {});
      expect(kd).to.be.true;
      expect(callback.calledOnce).to.be.true;
   });

   it('doesn\'t fire callbacks added in the past if propagation is stopped', () => {
      const k = 'p';
      const callback = fake();
      wrapper = mount(
         <KeyShortcut
            k={k}
            action={callback}
         />
      );

      const callback2 = fake();
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
      const callback = fake();
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
         const callback = fake();
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
      const callback = fake();
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

   it('has a modString logging tool', () => {
      expect(modString({
         ctrlKey: true,
      })).to.equal('ctrl');
      expect(modString({
         ctrlKey: false,
         altKey: true,
      })).to.equal('alt');
   });
});
