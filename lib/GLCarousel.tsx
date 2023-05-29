import React, {useCallback, useMemo, useState} from 'react';
import {Dimensions, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  clamp,
  useImage,
  Skia,
} from '@shopify/react-native-skia';

import {snapPoint} from './Math';
import {
  transition,
  cube,
  pageCurl,
  glitchMemories,
  swirl,
  swap,
  blurred,
} from './transitions/index';

const {width, height} = Dimensions.get('window');

const at = <T,>(array: T[] | null, index: number): T => {
  'worklet';
  if (array === null) {
    return null;
  }
  return array[((index % array.length) + array.length) % array.length];
};

const duration = 100;

interface GLCarouselProps {
  images: string[];
  transitions: string[];
}

const availableTransitions = [
  cube,
  pageCurl,
  glitchMemories,
  swirl,
  swap,
  blurred,
];
export const GLCarousel = ({images, transitions}: GLCarouselProps) => {
  // const effects =
  //   transitions && transitions.length > 0
  //     ? availableTransitions
  //         .filter(t => transitions.includes(t))
  //         .map(t => transition(t))
  //     : [pageCurl].map(t => transition(t));
  const effects = transitions.map(t => transition(t));
  if (!Array.isArray(images)) {
    throw new Error('"images" prop must be an array of at least one image');
  } else if (effects.length === 0) {
    throw new Error(
      '"transitions" prop must be an array of at least one transition',
    );
  } else if (!images || images.length === 0) {
    throw new Error('"images" prop must be an array of at least one image');
  }
  const offset = useSharedValue(0);
  const progressLeft = useSharedValue(0);
  const progressRight = useSharedValue(0);
  const assets = images.map(i => useImage(i));

  const next = useCallback(() => {
    offset.value += 1;
    progressLeft.value = 0;
  }, [offset, progressLeft]);

  const previous = useCallback(() => {
    offset.value -= 1;
    progressRight.value = 0;
  }, [offset, progressRight]);

  const panRight = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          progressRight.value = 0;
        })
        .activeOffsetX(5)
        .onChange(pos => {
          progressRight.value = clamp(
            progressRight.value + pos.changeX / width,
            0,
            1,
          );
        })
        .onEnd(({velocityX}) => {
          const dst = snapPoint(progressRight.value, velocityX / width, [0, 1]);
          progressRight.value = withTiming(dst, {duration}, () => {
            runOnJS(previous)();
          });
        }),
    [previous, progressRight],
  );
  const panLeft = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(-5)
        .onChange(pos => {
          progressLeft.value = clamp(
            progressLeft.value - pos.changeX / width,
            0,
            1,
          );
        })
        .onEnd(({velocityX}) => {
          const dst = snapPoint(progressLeft.value, -velocityX / width, [0, 1]);
          progressLeft.value = withTiming(dst, {duration}, () => {
            runOnJS(next)();
          });
        }),
    [next, progressLeft],
  );

  const uniformsRight = useDerivedValue(() => {
    return {
      progress: progressRight.value,
      resolution: [width, height],
    };
  });

  const uniformsLeft = useDerivedValue(() => {
    return {
      progress: progressLeft.value,
      resolution: [width, height],
    };
  });
  const transition1 = useDerivedValue(() => {
    return at(effects, offset.value - 1);
  });

  const transition2 = useDerivedValue(() => {
    return at(effects, offset.value);
  });

  const assets1 = useDerivedValue(() => {
    return at(assets, offset.value - 1);
  });

  const assets2 = useDerivedValue(() => {
    return at(assets, offset.value);
  });

  const assets3 = useDerivedValue(() => {
    return at(assets, offset.value + 1);
  });

  return (
    <View style={{flex: 1}}>
      <GestureDetector gesture={Gesture.Race(panRight, panLeft)}>
        <Canvas style={{flex: 1}}>
          <Fill>
            <Shader source={transition1} uniforms={uniformsRight}>
              <Shader source={transition2} uniforms={uniformsLeft}>
                <ImageShader
                  image={assets2}
                  fit="cover"
                  width={width}
                  height={height}
                />
                <ImageShader
                  image={assets3}
                  fit="cover"
                  width={width}
                  height={height}
                />
              </Shader>
              <ImageShader
                image={assets1}
                fit="cover"
                width={width}
                height={height}
              />
            </Shader>
          </Fill>
        </Canvas>
      </GestureDetector>
    </View>
  );
};
