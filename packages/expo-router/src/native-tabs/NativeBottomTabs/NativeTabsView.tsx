import React, { useDeferredValue } from 'react';
import type { ColorValue } from 'react-native';
import {
  BottomTabs,
  BottomTabsScreen,
  featureFlags,
  type BottomTabsProps,
  type BottomTabsScreenAppearance,
  type BottomTabsScreenItemAppearance,
  type BottomTabsScreenItemStateAppearance,
  type BottomTabsScreenProps,
} from 'react-native-screens';

import {
  SUPPORTED_BLUR_EFFECTS,
  SUPPORTED_TAB_BAR_ITEM_LABEL_VISIBILITY_MODES,
  SUPPORTED_TAB_BAR_MINIMIZE_BEHAVIORS,
  type NativeTabOptions,
  type NativeTabsBlurEffect,
  type NativeTabsLabelStyle,
  type NativeTabsViewProps,
} from './types';
import { shouldTabBeVisible } from './utils';

// We let native tabs to control the changes. This requires freeze to be disabled for tab bar.
// Otherwise user may see glitches when switching between tabs.
featureFlags.experiment.controlledBottomTabs = false;

export function NativeTabsView(props: NativeTabsViewProps) {
  const {
    builder,
    minimizeBehavior,
    disableIndicator,
    focusedIndex,
    disableTransparentOnScrollEdge,
  } = props;
  const { state, descriptors, navigation } = builder;
  const { routes } = state;

  const deferredFocusedIndex = useDeferredValue(focusedIndex);
  let standardAppearance = convertStyleToAppearance({
    ...props.labelStyle,
    iconColor: props.iconColor,
    blurEffect: props.blurEffect,
    backgroundColor: props.backgroundColor,
    badgeBackgroundColor: props.badgeBackgroundColor,
  });
  if (props.tintColor) {
    standardAppearance = appendSelectedStyleToAppearance(
      { iconColor: props.tintColor, color: props.tintColor },
      standardAppearance
    );
  }
  const scrollEdgeAppearance = convertStyleToAppearance({
    ...props.labelStyle,
    iconColor: props.iconColor,
    blurEffect: disableTransparentOnScrollEdge ? props.blurEffect : 'none',
    backgroundColor: disableTransparentOnScrollEdge ? props.backgroundColor : null,
    badgeBackgroundColor: props.badgeBackgroundColor,
  });

  const appearances = routes.map((route) => ({
    standardAppearance: createStandardAppearanceFromOptions(
      descriptors[route.key].options,
      standardAppearance
    ),
    scrollEdgeAppearance: createScrollEdgeAppearanceFromOptions(
      descriptors[route.key].options,
      scrollEdgeAppearance
    ),
  }));

  const options = routes.map((route) => descriptors[route.key].options);

  const children = routes
    .map((route, index) => ({ route, index }))
    .filter(({ route: { key } }) => shouldTabBeVisible(descriptors[key].options))
    .map(({ route, index }) => {
      const descriptor = descriptors[route.key];
      const isFocused = index === deferredFocusedIndex;

      return (
        <Screen
          key={route.key}
          routeKey={route.key}
          name={route.name}
          descriptor={descriptor}
          isFocused={isFocused}
          standardAppearance={appearances[index].standardAppearance}
          scrollEdgeAppearance={appearances[index].scrollEdgeAppearance}
          badgeTextColor={props.badgeTextColor}
        />
      );
    });

  return (
    <BottomTabsWrapper
      // #region android props
      tabBarItemTitleFontColor={standardAppearance.stacked?.normal?.tabBarItemTitleFontColor}
      tabBarItemTitleFontFamily={standardAppearance.stacked?.normal?.tabBarItemTitleFontFamily}
      tabBarItemTitleFontSize={standardAppearance.stacked?.normal?.tabBarItemTitleFontSize}
      tabBarItemTitleFontSizeActive={standardAppearance.stacked?.normal?.tabBarItemTitleFontSize}
      tabBarItemTitleFontWeight={standardAppearance.stacked?.normal?.tabBarItemTitleFontWeight}
      tabBarItemTitleFontStyle={standardAppearance.stacked?.normal?.tabBarItemTitleFontStyle}
      tabBarItemIconColor={standardAppearance.stacked?.normal?.tabBarItemIconColor}
      tabBarBackgroundColor={
        appearances[deferredFocusedIndex].standardAppearance?.tabBarBackgroundColor ??
        props.backgroundColor ??
        undefined
      }
      tabBarItemRippleColor={props.rippleColor}
      tabBarItemLabelVisibilityMode={props.labelVisibilityMode}
      tabBarItemIconColorActive={
        appearances[deferredFocusedIndex].standardAppearance?.stacked?.selected
          ?.tabBarItemIconColor ?? props?.tintColor
      }
      tabBarItemTitleFontColorActive={
        appearances[deferredFocusedIndex].standardAppearance?.stacked?.selected
          ?.tabBarItemTitleFontColor ?? props?.tintColor
      }
      // tabBarItemTitleFontSizeActive={activeStyle?.fontSize}
      tabBarItemActiveIndicatorColor={
        options[deferredFocusedIndex]?.indicatorColor ?? props?.indicatorColor
      }
      tabBarItemActiveIndicatorEnabled={!disableIndicator}
      // #endregion
      // #region iOS props
      tabBarTintColor={props?.tintColor}
      tabBarMinimizeBehavior={minimizeBehavior}
      // #endregion
      onNativeFocusChange={({ nativeEvent: { tabKey } }) => {
        const descriptor = descriptors[tabKey];
        const route = descriptor.route;
        navigation.dispatch({
          type: 'JUMP_TO',
          target: state.key,
          payload: {
            name: route.name,
          },
        });
      }}>
      {children}
    </BottomTabsWrapper>
  );
}

function Screen(props: {
  routeKey: string;
  name: string;
  descriptor: NativeTabsViewProps['builder']['descriptors'][string];
  isFocused: boolean;
  standardAppearance: BottomTabsScreenAppearance;
  scrollEdgeAppearance: BottomTabsScreenAppearance;
  badgeTextColor: ColorValue | undefined;
}) {
  const {
    routeKey,
    name,
    descriptor,
    isFocused,
    standardAppearance,
    scrollEdgeAppearance,
    badgeTextColor,
  } = props;
  const title = descriptor.options.title ?? name;

  let icon = convertOptionsIconToPropsIcon(descriptor.options.icon);

  // Fix for an issue in screens
  if (descriptor.options.role) {
    switch (descriptor.options.role) {
      case 'search':
        icon = { sfSymbolName: 'magnifyingglass' };
    }
  }

  return (
    <BottomTabsScreen
      {...descriptor.options}
      tabBarItemBadgeBackgroundColor={
        standardAppearance.stacked?.normal?.tabBarItemBadgeBackgroundColor
      }
      tabBarItemBadgeTextColor={badgeTextColor}
      standardAppearance={standardAppearance}
      scrollEdgeAppearance={scrollEdgeAppearance}
      iconResourceName={getAndroidIconResourceName(descriptor.options.icon)}
      iconResource={getAndroidIconResource(descriptor.options.icon)}
      icon={icon}
      selectedIcon={convertOptionsIconToPropsIcon(descriptor.options.selectedIcon)}
      title={title}
      freezeContents={false}
      tabKey={routeKey}
      systemItem={descriptor.options.role}
      isFocused={isFocused}>
      {descriptor.render()}
    </BottomTabsScreen>
  );
}

function createStandardAppearanceFromOptions(
  options: NativeTabOptions,
  baseStandardAppearance: BottomTabsScreenAppearance
): BottomTabsScreenAppearance {
  // TODO: Add iconColor, badgeBackgroundColor and titlePositionAdjustment - this will come from <TabBar />
  return appendSelectedStyleToAppearance(
    {
      ...(options.selectedLabelStyle ?? {}),
      iconColor: options.selectedIconColor,
      backgroundColor: options.backgroundColor,
      blurEffect: options.blurEffect,
      badgeBackgroundColor: options.selectedBadgeBackgroundColor,
      titlePositionAdjustment: options.selectedTitlePositionAdjustment,
    },
    baseStandardAppearance
  );
}

function createScrollEdgeAppearanceFromOptions(
  options: NativeTabOptions,
  baseScrollEdgeAppearance: BottomTabsScreenAppearance
): BottomTabsScreenAppearance {
  return appendSelectedStyleToAppearance(
    {
      ...(options.selectedLabelStyle ?? {}),
      iconColor: options.selectedIconColor,
      blurEffect: options.disableTransparentOnScrollEdge ? options.blurEffect : 'none',
      backgroundColor: options.disableTransparentOnScrollEdge ? options.backgroundColor : null,
      badgeBackgroundColor: options.badgeBackgroundColor,
      titlePositionAdjustment: options.selectedTitlePositionAdjustment,
    },
    baseScrollEdgeAppearance
  );
}

interface CustomStyle extends NativeTabsLabelStyle {
  iconColor?: ColorValue;
  backgroundColor?: ColorValue | null;
  blurEffect?: NativeTabsBlurEffect;
  badgeBackgroundColor?: ColorValue;
  titlePositionAdjustment?: {
    horizontal?: number;
    vertical?: number;
  };
}

function appendSelectedStyleToAppearance(
  selectedStyle: CustomStyle,
  appearance: BottomTabsScreenAppearance
): BottomTabsScreenAppearance {
  let tabBarBlurEffect = selectedStyle?.blurEffect;
  if (tabBarBlurEffect && !supportedBlurEffectsSet.has(tabBarBlurEffect)) {
    console.warn(
      `Unsupported blurEffect: ${tabBarBlurEffect}. Supported values are: ${SUPPORTED_BLUR_EFFECTS.map((effect) => `"${effect}"`).join(', ')}`
    );
    tabBarBlurEffect = undefined;
  }
  const baseItemAppearance =
    appearance.stacked || appearance.inline || appearance.compactInline || {};
  const selectedAppearance: BottomTabsScreenItemStateAppearance = {
    ...baseItemAppearance.normal,
    ...baseItemAppearance.selected,
    ...convertStyleToItemStateAppearance(selectedStyle),
  };
  const itemAppearance: BottomTabsScreenItemAppearance = {
    ...baseItemAppearance,
    selected: selectedAppearance,
    focused: selectedAppearance,
  };
  return {
    stacked: itemAppearance,
    inline: itemAppearance,
    compactInline: itemAppearance,
    tabBarBackgroundColor:
      selectedStyle.backgroundColor === null
        ? undefined
        : (selectedStyle.backgroundColor ?? appearance.tabBarBackgroundColor),
    tabBarBlurEffect: tabBarBlurEffect ?? appearance.tabBarBlurEffect,
  };
}

const supportedBlurEffectsSet = new Set<string>(SUPPORTED_BLUR_EFFECTS);

function convertStyleToAppearance(style: CustomStyle | undefined): BottomTabsScreenAppearance {
  if (!style) {
    return {};
  }
  let blurEffect = style.blurEffect;
  if (style.blurEffect && !supportedBlurEffectsSet.has(style.blurEffect)) {
    console.warn(
      `Unsupported blurEffect: ${style.blurEffect}. Supported values are: ${SUPPORTED_BLUR_EFFECTS.map(
        (effect) => `"${effect}"`
      ).join(', ')}`
    );
    blurEffect = undefined;
  }
  const stateAppearance = convertStyleToItemStateAppearance(style);
  const itemAppearance: BottomTabsScreenItemAppearance = {
    normal: stateAppearance,
    selected: stateAppearance,
    focused: stateAppearance,
    disabled: {},
  };
  return {
    inline: itemAppearance,
    stacked: itemAppearance,
    compactInline: itemAppearance,
    tabBarBackgroundColor: style?.backgroundColor ?? undefined,
    tabBarBlurEffect: blurEffect,
  };
}

function convertStyleToItemStateAppearance(
  style: CustomStyle | undefined
): BottomTabsScreenItemStateAppearance {
  if (!style) {
    return {};
  }
  const stateAppearance: BottomTabsScreenItemStateAppearance = {
    tabBarItemBadgeBackgroundColor: style.badgeBackgroundColor,
    tabBarItemTitlePositionAdjustment: style.titlePositionAdjustment,
    tabBarItemIconColor: style.iconColor,
    tabBarItemTitleFontFamily: style.fontFamily,
    tabBarItemTitleFontSize: style.fontSize,
    // Only string values are accepted by rn-screens
    tabBarItemTitleFontWeight: style?.fontWeight
      ? (String(style.fontWeight) as `${NonNullable<(typeof style)['fontWeight']>}`)
      : undefined,
    tabBarItemTitleFontStyle: style.fontStyle,
    tabBarItemTitleFontColor: style.color,
  };

  (Object.keys(stateAppearance) as (keyof BottomTabsScreenItemStateAppearance)[]).forEach((key) => {
    if (stateAppearance[key] === undefined) {
      delete stateAppearance[key];
    }
  });

  return stateAppearance;
}

function convertOptionsIconToPropsIcon(
  icon: NativeTabOptions['icon']
): BottomTabsScreenProps['icon'] {
  if (!icon) {
    return undefined;
  }
  if ('sf' in icon && icon.sf) {
    return { sfSymbolName: icon.sf };
  } else if ('src' in icon && icon.src) {
    return { templateSource: icon.src };
  }
  return undefined;
}

function getAndroidIconResource(
  icon: NativeTabOptions['icon']
): BottomTabsScreenProps['iconResource'] {
  if (icon && 'src' in icon && icon.src) {
    return icon.src;
  }
  return undefined;
}

function getAndroidIconResourceName(
  icon: NativeTabOptions['icon']
): BottomTabsScreenProps['iconResourceName'] {
  if (icon && 'drawable' in icon && icon.drawable) {
    return icon.drawable;
  }
  return undefined;
}

const supportedTabBarMinimizeBehaviorsSet = new Set<string>(SUPPORTED_TAB_BAR_MINIMIZE_BEHAVIORS);
const supportedTabBarItemLabelVisibilityModesSet = new Set<string>(
  SUPPORTED_TAB_BAR_ITEM_LABEL_VISIBILITY_MODES
);

function BottomTabsWrapper(props: BottomTabsProps) {
  let { tabBarMinimizeBehavior, tabBarItemLabelVisibilityMode, ...rest } = props;
  if (tabBarMinimizeBehavior && !supportedTabBarMinimizeBehaviorsSet.has(tabBarMinimizeBehavior)) {
    console.warn(
      `Unsupported minimizeBehavior: ${tabBarMinimizeBehavior}. Supported values are: ${SUPPORTED_TAB_BAR_MINIMIZE_BEHAVIORS.map((behavior) => `"${behavior}"`).join(', ')}`
    );
    tabBarMinimizeBehavior = undefined;
  }
  if (
    tabBarItemLabelVisibilityMode &&
    !supportedTabBarItemLabelVisibilityModesSet.has(tabBarItemLabelVisibilityMode)
  ) {
    console.warn(
      `Unsupported labelVisibilityMode: ${tabBarItemLabelVisibilityMode}. Supported values are: ${SUPPORTED_TAB_BAR_ITEM_LABEL_VISIBILITY_MODES.map((mode) => `"${mode}"`).join(', ')}`
    );
    tabBarItemLabelVisibilityMode = undefined;
  }

  return (
    <BottomTabs
      tabBarItemLabelVisibilityMode={tabBarItemLabelVisibilityMode}
      tabBarMinimizeBehavior={tabBarMinimizeBehavior}
      {...rest}
    />
  );
}
