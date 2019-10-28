import * as R from 'ramda';
import React from 'react';


const modifierDefaults = {
   altKey: false,
   ctrlKey: false,
   shiftKey: false,
   metaKey: false,
};
const possibleModifiers = R.keys(modifierDefaults);

// ignore these when logging, they cause duplicate messages
const REDUNDANT_KEYS = ['Control', 'Meta', 'Alt', 'Shift'];
const isRedundantKey = k => REDUNDANT_KEYS.includes(k);

const liftIntoArray = R.ifElse(
   Array.isArray,
   R.identity,
   R.append(R.__, [])
);

const notIn = R.complement(R.includes);

const valueNotIn = R.flip(notIn);

const defaultToArray = R.defaultTo([]);

const logKey = (key, modifiers, labels = []) => {
   if (isRedundantKey(key)) {
      return;
   }
   const label = labels.length ? labels.join('  ') : 'KEY';
   console.log(
      `%c${label}`,
      'color: white; background-color: black; padding: 2px 4px;',
      modifiers,
      key,
   );
};

const filterToModifiers = R.pick(possibleModifiers);
const filterTrueModifiers = R.compose(
   R.filter(R.equals(true)),
   filterToModifiers
);
const modifiersMatch = R.eqBy(filterToModifiers);

/**
 * Return a string of modifier keys from a keyboard
 * event separated by a space.
 */
export const modifierString = R.compose(
   R.join(' '),
   R.map(R.replace('Key', '')),
   R.keys,
   filterTrueModifiers
);

export const filterLabels = R.into(
   [],
   R.compose(
      R.map(k => k.label || k.action.name),
      R.filter(R.identity),
   )
);

export const isLoggingOn = R.compose(
   R.any(R.prop('log')),
   R.reduce(R.concat, []),
   R.values,
);

export const KeyContext = () => {
   let listeningFor = {};

   // number of registered listeners (for listener ID)
   let listenerCount = 0;

   const listener = (e) => {
      const handlers = defaultToArray(listeningFor[e.key]);
      const firedActions = R.reduce((acc, k) => {
         if (modifiersMatch(e, k)) {
            const next = acc.concat(k);
            if (typeof k.action === 'function') {
               k.action(e);
            }
            if (k.preventDefault) {
               e.preventDefault();
            }
            if (k.stopPropagation) {
               e.stopPropagation();
               // short-circuit to prevent other handlers from running
               return R.reduced(next);
            }
            return next;
         }
         return acc;
      }, [], handlers);

      if (isLoggingOn(listeningFor)) {
         logKey(e.key, modifierString(e), filterLabels(firedActions));
      }
   };
   if (typeof document !== 'undefined') {
      document.addEventListener('keydown', listener, false);
   }
   return {
      total() {
         return listenerCount;
      },
      listeners() {
         return listeningFor;
      },
      addListener({
         key,
         action,
         modifiers,
         preventDefault = false,
         stopPropagation = false,
         log = false,
         label,
      }) {
         listenerCount = R.inc(listenerCount);
         const id = listenerCount;

         const keyData = {
            ...modifierDefaults,
            ...modifiers,
            id,
            key,
            action,
            preventDefault,
            stopPropagation,
            log,
            label,
         };

         listeningFor = R.over(
            R.lensProp(key),
            R.compose(
               R.prepend(keyData),
               R.defaultTo([])
            ),
            listeningFor
         );
         return id;
      },
      removeListener(id) {
         const ids = liftIntoArray(id);
         const filterIds = R.filter(
            R.compose(valueNotIn(ids), R.prop('id')),
         );
         listeningFor = R.map(filterIds, listeningFor);
      },
      cleanup() {
         document.removeEventListener('keydown', listener, false);
      },
   };
};

export const keyContext = KeyContext();

const KeyShortcut = ({
   k,
   action,
   shift = false,
   alt = false,
   ctrl = false,
   meta = false,
   preventDefault,
   stopPropagation,
   log = false,
   context = keyContext,
   label = false,
}) => {
   const actionRef = React.useRef();

   // apply key listener just on mount/unmount
   React.useEffect(() => {
      actionRef.current = action;
      const id = context.addListener({
         key: k,
         action: actionRef.current,
         modifiers: {
            altKey: alt,
            shiftKey: shift,
            ctrlKey: ctrl,
            metaKey: meta,
         },
         preventDefault,
         stopPropagation,
         log,
         label,
      });
      return () => {
         context.removeListener(id);
      };
   }, [
      action,
      preventDefault,
      stopPropagation,
      log,
      label,
   ]);

   return null;
};


export default KeyShortcut;
