import { expect } from '@playwright/test';
import {
  COLUMNS_WITH_NEW_SPACE,
  COLUMNS_WITH_NEW_TEXT,
  COLUMNS_WITH_NEW_WIDTHS,
} from '../specs/columns.js';
import { NEW_TEXT } from '../specs/helpers.js';
import { HOMEPAGE } from '../specs/homepage.js';
import { checkIsRN, test, excludeGen1, excludeGen2, checkIsGen1React } from '../helpers/index.js';
import {
  cloneContent,
  launchEmbedderAndWaitForSdk,
  sendContentUpdateMessage,
  sendNewStateMessage,
  sendPatchOrUpdateMessage,
} from '../helpers/visual-editor.js';
import { MODIFIED_EDITING_COLUMNS } from '../specs/editing-columns-inner-layout.js';
import { ADD_A_TEXT_BLOCK } from '../specs/duplicated-content-using-nested-symbols.js';
import { EDITING_STYLES } from '../specs/editing-styles.js';
import { ACCORDION_WITH_NO_DETAIL } from '../specs/accordion.js';
import { CUSTOM_COMPONENT_NO_DEFAULT_VALUE } from '../specs/custom-component-no-default-value.js';
import { SYMBOLS_WITH_LIST_CONTENT_INPUT } from '../specs/symbols-with-list-content-input.js';
import { NEW_BLOCK_ADD, NEW_BLOCK_ADD_2 } from '../specs/new-block-add.js';
import { SECTION_CHILDREN } from '../specs/section-children.js';
import {
  GET_CONTENT_SYMBOL_UPDATE_ENTRY_ONE,
  GET_CONTENT_SYMBOL_UPDATE_ENTRY__TWO,
  MAIN_CONTENT,
} from '../specs/get-content-symbol-update-entry.js';
const editorTests = ({
  noTrustedHosts,
  editorIsInViewPort,
}: {
  noTrustedHosts: boolean;
  editorIsInViewPort?: boolean;
}) => {
  test('correctly updates Text block', async ({ page, basePort, packageName, sdk }) => {
    test.skip(
      packageName === 'gen1-next14-pages' ||
        packageName === 'gen1-next15-app' ||
        packageName === 'gen1-remix'
    );

    if (!editorIsInViewPort) {
      test.skip(sdk !== 'qwik', 'This is Qwik only test');
    }

    await launchEmbedderAndWaitForSdk({
      path: noTrustedHosts
        ? '/no-trusted-hosts'
        : editorIsInViewPort
          ? '/editing'
          : '/editing-with-top-padding',
      basePort,
      page,
      sdk,
    });

    await expect(
      page.frameLocator('iframe').getByText('SDK Feature testing project')
    ).toBeVisible();

    await sendPatchOrUpdateMessage({
      page,
      content: cloneContent(HOMEPAGE),
      model: 'page',
      sdk,
      path: '/data/blocks/0/children/0/component/options/text',
      updateFn: () => 'foo-bar-new-text',
    });

    await expect(page.frameLocator('iframe').getByText('foo-bar-new-text')).toBeVisible();
  });

  test('correctly updates Text block styles', async ({ page, packageName, basePort, sdk }) => {
    test.skip(
      packageName === 'gen1-next14-pages' ||
        packageName === 'gen1-next15-app' ||
        packageName === 'gen1-remix'
    );

    await launchEmbedderAndWaitForSdk({
      path: noTrustedHosts ? '/editing-styles-no-trusted-hosts' : '/editing-styles',
      basePort,
      page,
      sdk,
    });
    const btn1 = page.frameLocator('iframe').getByRole(sdk === 'oldReact' ? 'button' : 'link');
    await expect(btn1).toHaveCSS('background-color', 'rgb(184, 35, 35)');

    await sendPatchOrUpdateMessage({
      page,
      content: cloneContent(EDITING_STYLES),
      model: 'page',
      sdk,
      path: '/data/blocks/0/responsiveStyles/large/backgroundColor',
      updateFn: () => 'rgb(19, 67, 92)',
      editType: packageName === 'nextjs-sdk-next-app' ? 'client' : undefined,
    });

    const btn = page.frameLocator('iframe').getByRole(sdk === 'oldReact' ? 'button' : 'link');
    await expect(btn).toHaveCSS('background-color', 'rgb(19, 67, 92)');
  });
};

test.describe('Visual Editing', () => {
  editorTests({ noTrustedHosts: false, editorIsInViewPort: false });
  test('correctly updates Box -> Columns when used Inner Layout > Columns option', async ({
    page,
    packageName,
    basePort,
    sdk,
  }) => {
    test.skip(
      packageName === 'gen1-next15-app' ||
        packageName === 'gen1-react' ||
        packageName === 'gen1-remix' ||
        packageName === 'gen1-next14-pages' ||
        packageName === 'nextjs-sdk-next-app'
    );

    await launchEmbedderAndWaitForSdk({
      path: '/editing-box-columns-inner-layout',
      basePort,
      page,
      sdk,
    });

    const firstText = page.frameLocator('iframe').getByText('first');
    const secondText = page.frameLocator('iframe').getByText('second');
    await expect(firstText).toBeVisible();
    await expect(secondText).toBeVisible();
    const firstBox = await firstText.boundingBox();
    const secondBox = await secondText.boundingBox();
    if (firstBox && secondBox) {
      expect(firstBox.y).toBeLessThan(secondBox.y);
    }

    await sendContentUpdateMessage({
      page,
      newContent: MODIFIED_EDITING_COLUMNS,
      model: 'page',
      editType: packageName === 'nextjs-sdk-next-app' ? 'server' : undefined,
    });
    // had to hack this so that we can wait for the content update to actually show up (was failing in Qwik)
    await page.frameLocator('iframe').getByText('third').waitFor();

    const updatedFirstText = page.frameLocator('iframe').getByText('third');
    await expect(updatedFirstText).toBeVisible();
    await expect(secondText).toBeVisible();
    const updatedFirstBox = await updatedFirstText.boundingBox();
    const updatedSecondBox = await secondText.boundingBox();
    if (updatedFirstBox && updatedSecondBox) {
      if (checkIsRN(sdk)) {
        // stack layout incase of RN SDK
        expect(updatedFirstBox.x).toBe(updatedSecondBox.x);
        expect(updatedFirstBox.y).toBeLessThan(updatedSecondBox.y);
      } else {
        expect(updatedFirstBox.x).toBeLessThan(updatedSecondBox.x);
        expect(updatedFirstBox.y).toBe(updatedSecondBox.y);
      }
    }
  });

  test('correctly updating custom components when default value is not set', async ({
    page,
    basePort,
    sdk,
    packageName,
  }) => {
    test.skip(!['react', 'qwik-city'].includes(packageName));
    await launchEmbedderAndWaitForSdk({
      path: '/custom-components-no-default-value',
      basePort,
      page,
      sdk,
    });

    const defaultText = page
      .frameLocator('iframe')
      .locator('[builder-id="builder-d01784d1ca964e0da958ab4a4a891b08"]');
    await expect(defaultText).toBeEmpty();

    const newContent = cloneContent(CUSTOM_COMPONENT_NO_DEFAULT_VALUE);
    newContent.data.blocks[0].component.options.text = 'FOO';
    await sendContentUpdateMessage({ page, newContent, model: 'page' });
    const updatedText = page
      .frameLocator('iframe')
      .locator('[builder-id="builder-d01784d1ca964e0da958ab4a4a891b08"]');
    await expect(updatedText).toHaveText('FOO');
  });

  test('removal of styles should work properly', async ({ page, packageName, sdk, basePort }) => {
    test.skip(checkIsGen1React(sdk));

    await launchEmbedderAndWaitForSdk({
      path: '/editing-styles',
      basePort,
      page,
      sdk,
    });

    const buttonLocator = checkIsRN(sdk)
      ? page.frameLocator('iframe').getByText('Click me!').locator('..')
      : page.frameLocator('iframe').getByText('Click me!');

    await expect(buttonLocator).toHaveCSS('margin-top', '20px');
    const newContent = cloneContent(EDITING_STYLES);
    delete newContent.data.blocks[0].responsiveStyles.large.marginTop;

    await sendContentUpdateMessage({
      page,
      newContent,
      model: 'page',
      editType: packageName === 'nextjs-sdk-next-app' ? 'client' : undefined,
    });

    await expect(buttonLocator).toHaveCSS('margin-top', '0px');
  });

  test('nested ContentVariants with same model name should not duplicate content', async ({
    page,
    packageName,
    basePort,
    sdk,
  }) => {
    test.skip(
      packageName === 'gen1-next14-pages' ||
        packageName === 'gen1-next15-app' ||
        packageName === 'gen1-react' ||
        packageName === 'gen1-remix' ||
        packageName === 'nextjs-sdk-next-app'
    );

    test.skip(packageName === 'vue', 'Vue tests flake on this one for an unnkown reason.');

    await page.goto('/duplicated-content-using-nested-symbols');
    await launchEmbedderAndWaitForSdk({
      path: '/duplicated-content-using-nested-symbols',
      basePort,
      page,
      sdk,
    });

    await sendContentUpdateMessage({
      page,
      newContent: ADD_A_TEXT_BLOCK,
      model: 'symbol',
    });

    await page.frameLocator('iframe').getByText('something other than the symbol!').waitFor();

    const textBlocks = await page
      .frameLocator('iframe')
      .getByText('something other than the symbol!')
      .all();
    expect(textBlocks.length).toBe(1);
  });

  test.describe('Column block', () => {
    test('correctly updates nested Text block', async ({ page, basePort, packageName, sdk }) => {
      test.skip(
        packageName === 'gen1-next14-pages' ||
          packageName === 'gen1-next15-app' ||
          packageName === 'gen1-react' ||
          packageName === 'gen1-remix' ||
          packageName === 'nextjs-sdk-next-app'
      );

      await launchEmbedderAndWaitForSdk({ path: '/columns', basePort, page, sdk });
      await sendContentUpdateMessage({
        page,
        newContent: COLUMNS_WITH_NEW_TEXT,
        model: 'page',
        editType: packageName === 'nextjs-sdk-next-app' ? 'server' : undefined,
      });
      await page.frameLocator('iframe').getByText(NEW_TEXT).waitFor();
    });
    test('correctly updates space prop', async ({ page, basePort, packageName, sdk }) => {
      test.skip(
        packageName === 'gen1-next14-pages' ||
          packageName === 'gen1-next15-app' ||
          packageName === 'gen1-react' ||
          packageName === 'gen1-remix' ||
          packageName === 'nextjs-sdk-next-app'
      );

      const selector = checkIsRN(sdk)
        ? '[data-builder-block-name=builder-column]'
        : '.builder-column';
      await launchEmbedderAndWaitForSdk({ path: '/columns', basePort, page, sdk });
      const secondColumn = page.frameLocator('iframe').locator(selector).nth(1);

      await expect(secondColumn).toHaveCSS('margin-left', checkIsRN(sdk) ? '0px' : '20px');
      await sendContentUpdateMessage({
        page,
        newContent: COLUMNS_WITH_NEW_SPACE,
        model: 'page',
        editType: packageName === 'nextjs-sdk-next-app' ? 'server' : undefined,
      });
      await expect(secondColumn).toHaveCSS('margin-left', '10px');
    });
    test('correctly updates width props', async ({ page, basePort, packageName, sdk }) => {
      test.skip(
        packageName === 'react-native-74' ||
          packageName === 'react-native-76-fabric' ||
          packageName === 'gen1-next14-pages' ||
          packageName === 'gen1-next15-app' ||
          packageName === 'gen1-react' ||
          packageName === 'gen1-remix' ||
          packageName === 'nextjs-sdk-next-app'
      );

      await launchEmbedderAndWaitForSdk({ path: '/columns', basePort, page, sdk });
      const secondColumn = page.frameLocator('iframe').locator('.builder-column').nth(1);

      const initialWidth = await secondColumn.evaluate(el =>
        getComputedStyle(el).width.replace('px', '')
      );

      await sendContentUpdateMessage({
        page,
        newContent: COLUMNS_WITH_NEW_WIDTHS,
        model: 'page',
        editType: packageName === 'nextjs-sdk-next-app' ? 'server' : undefined,
      });

      await expect
        .poll(
          async () => {
            const currentWidth = await secondColumn.evaluate(el =>
              getComputedStyle(el).width.replace('px', '')
            );
            return Number(currentWidth);
          },
          {
            message: 'Waiting for column width to increase',
            timeout: 5000,
          }
        )
        .toBeGreaterThan(Number(initialWidth));
    });
  });

  test.describe('Accordion block', () => {
    test('inserting a new detail item adds it to the correct place in the accordion', async ({
      page,
      sdk,
      basePort,
      packageName,
    }) => {
      test.skip(
        packageName === 'nextjs-sdk-next-app' ||
          packageName === 'gen1-next14-pages' ||
          packageName === 'gen1-next15-app' ||
          packageName === 'gen1-react' ||
          packageName === 'gen1-remix' ||
          packageName === 'qwik-city'
      );
      await launchEmbedderAndWaitForSdk({ path: '/accordion-no-detail', basePort, page, sdk });

      const item1 = page.frameLocator('iframe').getByText('Item 1');
      const NEW_DETAILS_TEXT = 'new detail';

      await item1.click();

      await expect(page.frameLocator('iframe').getByText(NEW_DETAILS_TEXT)).not.toBeVisible();

      // reset
      await item1.click();

      const accordion = cloneContent(ACCORDION_WITH_NO_DETAIL);

      // insert new detail item
      accordion.data.blocks[0].component.options.items[0].detail = [
        {
          id: 'some-random-id',
          component: {
            name: 'Text',
            options: { text: NEW_DETAILS_TEXT },
          },
        },
      ];

      await sendContentUpdateMessage({
        page,
        newContent: accordion,
        model: 'page',
      });

      // Re-query the item1 element as it might have been recreated
      const updatedItem1 = page.frameLocator('iframe').getByText('Item 1');
      await expect(updatedItem1).toBeVisible();
      await expect(updatedItem1).toBeEnabled();
      await expect(updatedItem1).toBeInViewport();
      await updatedItem1.click();

      const detailElement = page.frameLocator('iframe').getByText(NEW_DETAILS_TEXT);
      await expect(detailElement).toBeVisible();

      const [titleBox, detailBox] = await Promise.all([
        updatedItem1.boundingBox(),
        detailElement.boundingBox(),
      ]);

      if (!titleBox || !detailBox) {
        throw new Error('Title or detail box not found');
      }

      expect(detailBox.y).toBeGreaterThan(titleBox.y);
    });
  });

  test.describe('fails for empty trusted hosts', () => {
    test.fail();
    editorTests({ noTrustedHosts: true });
  });

  test.describe('Data Models', () => {
    test('correctly updates', async ({ page, packageName, basePort, sdk }) => {
      test.skip(packageName !== 'react', 'This test is only implemented for React');

      await launchEmbedderAndWaitForSdk({ path: '/data-preview', basePort, page, sdk });

      await page.frameLocator('iframe').getByText('coffee name: Epoch Chemistry').waitFor();
      await page.frameLocator('iframe').getByText('coffee info: Local coffee brand.').waitFor();
      await sendContentUpdateMessage({
        page,
        newContent: {
          data: { name: 'Anchored Coffee', info: 'Another coffee brand.' },
        },
        model: 'coffee',
      });
      await page.frameLocator('iframe').getByText('coffee name: Anchored Coffee').waitFor();
      await page.frameLocator('iframe').getByText('coffee info: Another coffee brand.').waitFor();
    });
  });

  test.describe('SDK', () => {
    test('should inject correct SDK data into iframe', async ({ page, basePort, sdk }) => {
      test.skip(excludeGen2(sdk));
      let consoleMsg = '';
      const msgPromise = page.waitForEvent('console', msg => {
        if (msg.text().includes('BUILDER_EVENT: builder.sdkInjected')) {
          consoleMsg = msg.text();
          return true;
        }
        return false;
      });
      await launchEmbedderAndWaitForSdk({
        page,
        basePort,
        path: '/editing',
        sdk,
      });
      await msgPromise;

      expect(consoleMsg).toContain('modelName: page');
      expect(consoleMsg).toContain('apiKey: abcd');
    });

    test('should inject correct SDK data into iframe for gen-2', async ({
      page,
      basePort,
      sdk,
    }) => {
      test.skip(excludeGen1(sdk));
      let consoleMsg = '';
      const msgPromise = page.waitForEvent('console', msg => {
        if (msg.text().includes('BUILDER_EVENT: builder.sdkInfo')) {
          consoleMsg = msg.text();
          return true;
        }
        return false;
      });
      await launchEmbedderAndWaitForSdk({
        page,
        basePort,
        path: '/editing',
        sdk,
      });
      await msgPromise;

      expect(consoleMsg).toContain('modelName: page');
      expect(consoleMsg).toContain('apiKey: abcd');
    });
  });

  test.describe('Content Input', () => {
    test('correctly updates', async ({ page, packageName, basePort, sdk }) => {
      test.skip(
        packageName === 'gen1-next14-pages' ||
          packageName === 'gen1-next15-app' ||
          packageName === 'gen1-remix' ||
          packageName === 'nextjs-sdk-next-app'
      );

      await launchEmbedderAndWaitForSdk({ path: '/content-input-bindings', basePort, page, sdk });
      await page.frameLocator('iframe').getByText('Bye').waitFor();

      await sendNewStateMessage({
        page,
        newState: {
          booleanToggle: true,
        },
        model: 'page',
        editType: packageName === 'nextjs-sdk-next-app' ? 'client' : undefined,
      });
      await page.frameLocator('iframe').getByText('Hello').waitFor();

      await sendNewStateMessage({
        page,
        newState: {
          booleanToggle: false,
        },
        model: 'page',
        editType: packageName === 'nextjs-sdk-next-app' ? 'client' : undefined,
      });
      await page.frameLocator('iframe').getByText('Bye').waitFor();
    });
  });

  test.describe('New Block addition and deletion', () => {
    test('should add new block below the last block', async ({
      page,
      basePort,
      sdk,
      packageName,
    }) => {
      test.skip(checkIsGen1React(sdk));
      test.skip(packageName === 'nextjs-sdk-next-app');
      test.skip(
        packageName === 'vue',
        `Failing on the CI: TypeError: Cannot read properties of null (reading 'namespaceURI')`
      );

      await launchEmbedderAndWaitForSdk({ path: '/new-block-add', basePort, page, sdk });

      const newContent = cloneContent(NEW_BLOCK_ADD);
      newContent.data.blocks.push({
        '@type': '@builder.io/sdk:Element',
        '@version': 2,
        id: 'builder-421fe741cdab4a5181fe83ffa0af7ff6',
        component: {
          name: 'Text',
          options: { text: 'new text' },
        },
      });

      await sendContentUpdateMessage({
        page,
        newContent,
        model: 'page',
        editType: packageName === 'nextjs-sdk-next-app' ? 'client' : undefined,
      });

      await page.frameLocator('iframe').getByText('new text').waitFor();

      const textBlocks = await page
        .frameLocator('iframe')
        .getByText('some text already published')
        .all();
      expect(textBlocks.length).toBe(1);
      const newTextBlockBox = await page.frameLocator('iframe').getByText('new text').boundingBox();
      expect(newTextBlockBox).toBeDefined();
      const textBlockBox = await textBlocks[0].boundingBox();
      expect(textBlockBox).toBeDefined();

      if (!newTextBlockBox || !textBlockBox) {
        throw new Error('New text block or text block not found');
      }

      expect(newTextBlockBox.y).toBeGreaterThan(textBlockBox.y);
    });

    test('should add new block in the middle', async ({ page, basePort, sdk, packageName }) => {
      test.skip(checkIsGen1React(sdk));
      test.skip(packageName === 'nextjs-sdk-next-app');
      test.skip(
        packageName === 'qwik-city' || packageName === 'nuxt',
        'Failing on the CI: Test timeout of 30000ms exceeded'
      );
      test.skip(
        packageName === 'vue',
        `Failing on the CI: TypeError: Cannot read properties of null (reading 'namespaceURI')`
      );

      await launchEmbedderAndWaitForSdk({ path: '/new-block-add', basePort, page, sdk });

      const newContent = cloneContent(NEW_BLOCK_ADD_2);

      newContent.data.blocks.splice(1, 0, {
        '@type': '@builder.io/sdk:Element',
        '@version': 2,
        id: 'builder-421fe741cdab4a5181fe83ffa0af7ff6',
        component: { name: 'Text', options: { text: 'add to middle' } },
      });

      await sendContentUpdateMessage({
        page,
        newContent,
        model: 'page',
      });
      await page.frameLocator('iframe').getByText('add to middle').waitFor();

      const topTextBlockBox = await page
        .frameLocator('iframe')
        .getByText('some text already published')
        .boundingBox();
      const endTextBlockBox = await page.frameLocator('iframe').getByText('end text').boundingBox();
      const middleTextBlockBox = await page
        .frameLocator('iframe')
        .getByText('add to middle')
        .boundingBox();

      expect(middleTextBlockBox).toBeDefined();
      expect(topTextBlockBox).toBeDefined();
      expect(endTextBlockBox).toBeDefined();

      if (!middleTextBlockBox || !topTextBlockBox || !endTextBlockBox) {
        throw new Error('New text block or text block not found');
      }

      expect(middleTextBlockBox.y).toBeGreaterThan(topTextBlockBox.y);
      expect(middleTextBlockBox.y).toBeLessThan(endTextBlockBox.y);
    });

    test('should add new block at the top', async ({ page, basePort, sdk, packageName }) => {
      test.skip(checkIsGen1React(sdk));
      test.skip(packageName === 'nextjs-sdk-next-app');
      test.skip(
        packageName === 'vue',
        `Failing on the CI: TypeError: Cannot read properties of null (reading 'namespaceURI')`
      );

      await launchEmbedderAndWaitForSdk({ path: '/new-block-add', basePort, page, sdk });

      const newContent = cloneContent(NEW_BLOCK_ADD);
      newContent.data.blocks.unshift({
        '@type': '@builder.io/sdk:Element',
        '@version': 2,
        id: 'builder-421fe741cdab4a5181fe83ffa0af7ff6',
        component: {
          name: 'Text',
          options: { text: 'add to top' },
        },
      });

      await sendContentUpdateMessage({
        page,
        newContent,
        model: 'page',
      });
      await page.frameLocator('iframe').getByText('add to top').waitFor();

      const textBlocks = await page
        .frameLocator('iframe')
        .getByText('some text already published')
        .all();
      expect(textBlocks.length).toBe(1);
      const newTextBlockBox = await page
        .frameLocator('iframe')
        .getByText('add to top')
        .boundingBox();
      expect(newTextBlockBox).toBeDefined();
      const textBlockBox = await textBlocks[0].boundingBox();
      expect(textBlockBox).toBeDefined();

      if (!newTextBlockBox || !textBlockBox) {
        throw new Error('New text block or text block not found');
      }

      expect(newTextBlockBox.y).toBeLessThan(textBlockBox.y);
    });

    test('deleting a newly added block should remove it from the DOM', async ({
      page,
      basePort,
      sdk,
      packageName,
    }) => {
      test.skip(checkIsGen1React(sdk));
      test.skip(packageName === 'nextjs-sdk-next-app');
      test.skip(
        packageName === 'vue',
        `Failing on the CI: TypeError: Cannot read properties of null (reading 'namespaceURI')`
      );

      await launchEmbedderAndWaitForSdk({ path: '/new-block-add', basePort, page, sdk });

      const newContent = cloneContent(NEW_BLOCK_ADD);
      newContent.data.blocks.push({
        '@type': '@builder.io/sdk:Element',
        '@version': 2,
        id: 'builder-421fe741cdab4a5181fe83ffa0af7ff6',
        component: {
          name: 'Text',
          options: { text: 'new text' },
        },
      });

      await sendContentUpdateMessage({
        page,
        newContent,
        model: 'page',
      });
      await page.frameLocator('iframe').getByText('new text').waitFor();

      const updatedContent = cloneContent(NEW_BLOCK_ADD);
      updatedContent.data.blocks.pop();

      await sendContentUpdateMessage({ page, newContent: updatedContent, model: 'page' });
      await page.frameLocator('iframe').getByText('new text').waitFor({ state: 'hidden' });
    });
  });

  test('Symbol should update the data when nested values are updated', async ({
    page,
    basePort,
    sdk,
    packageName,
  }) => {
    test.skip(
      sdk === 'qwik',
      'Qwik fails to update the data when nested values are updated. Need to raise another PR.'
    );
    test.skip(packageName === 'nextjs-sdk-next-app');
    // Loom for reference: https://www.loom.com/share/b951939394ca4758b4a362725016d30b?sid=c54d90f5-121a-4652-877e-5abb6ddd2605
    test.skip(
      sdk === 'vue',
      `Failing on the CI: TypeError: Cannot read properties of null (reading 'namespaceURI')`
    );
    test.skip(packageName === 'nextjs-sdk-next-app');
    test.skip(excludeGen1(sdk));

    await launchEmbedderAndWaitForSdk({
      path: '/symbols-with-list-content-input',
      basePort,
      page,
      sdk,
    });

    const newContent = cloneContent(SYMBOLS_WITH_LIST_CONTENT_INPUT);

    await sendPatchOrUpdateMessage({
      page,
      content: newContent,
      model: 'page',
      sdk,
      path: '/data/blocks/0/component/options/symbol/data/language/1/code',
      updateFn: () => 'AFK',
    });

    await page.frameLocator('iframe').getByText('AFK').waitFor();
  });

  test.describe('New Block addition and deletion with components using props.children / slots', () => {
    test('should add new block below the last block', async ({
      page,
      basePort,
      sdk,
      packageName,
    }) => {
      test.skip(checkIsGen1React(sdk));
      test.skip(packageName === 'nextjs-sdk-next-app');
      test.skip(
        packageName === 'vue',
        `Failing on the CI: TypeError: Cannot read properties of null (reading 'namespaceURI')`
      );
      test.skip(packageName === 'nextjs-sdk-next-app');

      await launchEmbedderAndWaitForSdk({ path: '/section-children', basePort, page, sdk });

      const newContent = cloneContent(SECTION_CHILDREN);
      newContent.data.blocks[0].children.push({
        '@type': '@builder.io/sdk:Element',
        '@version': 2,
        id: 'builder-421fe741cdab4a5181fe83ffa0af7ff6',
        component: {
          name: 'Text',
          options: { text: 'new text' },
        },
      });

      await sendContentUpdateMessage({
        page,
        newContent,
        model: 'page',
      });
      await page.frameLocator('iframe').getByText('new text').waitFor();

      const textBlocks = await page.frameLocator('iframe').getByText('text 2').all();
      expect(textBlocks.length).toBe(1);
      const newTextBlockBox = await page.frameLocator('iframe').getByText('new text').boundingBox();
      expect(newTextBlockBox).toBeDefined();
      const textBlockBox = await textBlocks[0].boundingBox();
      expect(textBlockBox).toBeDefined();

      if (!newTextBlockBox || !textBlockBox) {
        throw new Error('New text block or text block not found');
      }

      expect(newTextBlockBox.y).toBeGreaterThan(textBlockBox.y);
    });

    test('should add new block in the middle', async ({ page, basePort, sdk, packageName }) => {
      test.skip(checkIsGen1React(sdk));
      test.skip(packageName === 'nextjs-sdk-next-app');
      test.skip(
        packageName === 'vue',
        `Failing on the CI: TypeError: Cannot read properties of null (reading 'namespaceURI')`
      );

      await launchEmbedderAndWaitForSdk({ path: '/section-children', basePort, page, sdk });

      const newContent = cloneContent(SECTION_CHILDREN);

      newContent.data.blocks[0].children.splice(1, 0, {
        '@type': '@builder.io/sdk:Element',
        '@version': 2,
        id: 'builder-421fe741cdab4a5181fe83ffa0af7ff6',
        component: { name: 'Text', options: { text: 'add to middle' } },
      });

      await sendContentUpdateMessage({
        page,
        newContent,
        model: 'page',
      });
      await page.frameLocator('iframe').getByText('add to middle').waitFor();

      const topTextBlockBox = await page.frameLocator('iframe').getByText('text 1').boundingBox();
      const endTextBlockBox = await page.frameLocator('iframe').getByText('text 2').boundingBox();
      const middleTextBlockBox = await page
        .frameLocator('iframe')
        .getByText('add to middle')
        .boundingBox();

      expect(middleTextBlockBox).toBeDefined();
      expect(topTextBlockBox).toBeDefined();
      expect(endTextBlockBox).toBeDefined();

      if (!middleTextBlockBox || !topTextBlockBox || !endTextBlockBox) {
        throw new Error('Middle text block or text block not found');
      }

      expect(middleTextBlockBox.y).toBeGreaterThan(topTextBlockBox.y);
      expect(middleTextBlockBox.y).toBeLessThan(endTextBlockBox.y);
    });

    test('should add new block at the top', async ({ page, basePort, sdk, packageName }) => {
      test.skip(checkIsGen1React(sdk));
      test.skip(packageName === 'nextjs-sdk-next-app');
      test.skip(
        packageName === 'vue',
        `Failing on the CI: TypeError: Cannot read properties of null (reading 'namespaceURI')`
      );
      // Loom for reference: https://www.loom.com/share/646cf1a809c94860a4a0588b81254165?sid=5d112e02-cc00-4cb2-869a-a89238f71e42
      test.skip(packageName === 'nuxt', `Failing on the CI: Test timeout of 30000ms exceeded`);

      await launchEmbedderAndWaitForSdk({ path: '/section-children', basePort, page, sdk });

      const newContent = cloneContent(SECTION_CHILDREN);
      newContent.data.blocks[0].children.unshift({
        '@type': '@builder.io/sdk:Element',
        '@version': 2,
        id: 'builder-421fe741cdab4a5181fe83ffa0af7ff6',
        component: {
          name: 'Text',
          options: { text: 'add to top' },
        },
      });

      await sendContentUpdateMessage({
        page,
        newContent,
        model: 'page',
      });
      await page.frameLocator('iframe').getByText('add to top').waitFor();

      const textBlocks = await page.frameLocator('iframe').getByText('text 1').all();
      expect(textBlocks.length).toBe(1);
      const newTextBlockBox = await page
        .frameLocator('iframe')
        .getByText('add to top')
        .boundingBox();
      expect(newTextBlockBox).toBeDefined();
      const textBlockBox = await textBlocks[0].boundingBox();
      expect(textBlockBox).toBeDefined();

      if (!newTextBlockBox || !textBlockBox) {
        throw new Error('New text block or text block not found');
      }

      expect(newTextBlockBox.y).toBeLessThan(textBlockBox.y);
    });

    test('deleting a newly added block should remove it from the DOM', async ({
      page,
      basePort,
      sdk,
      packageName,
    }) => {
      test.skip(checkIsGen1React(sdk));
      test.skip(packageName === 'nextjs-sdk-next-app');
      test.skip(
        packageName === 'vue',
        `Failing on the CI: TypeError: Cannot read properties of null (reading 'namespaceURI')`
      );

      await launchEmbedderAndWaitForSdk({ path: '/section-children', basePort, page, sdk });

      const newContent = cloneContent(SECTION_CHILDREN);
      newContent.data.blocks[0].children.push({
        '@type': '@builder.io/sdk:Element',
        '@version': 2,
        id: 'builder-421fe741cdab4a5181fe83ffa0af7ff6',
        component: {
          name: 'Text',
          options: { text: 'new text' },
        },
      });

      await sendContentUpdateMessage({
        page,
        newContent,
        model: 'page',
      });
      await page.frameLocator('iframe').getByText('new text').waitFor();

      const updatedContent = cloneContent(SECTION_CHILDREN);
      updatedContent.data.blocks[0].children.pop();

      await sendContentUpdateMessage({ page, newContent: updatedContent, model: 'page' });
      await page.frameLocator('iframe').getByText('new text').waitFor({ state: 'hidden' });
    });
  });
});

test('Symbol should update the data when entry is updated', async ({
  page,
  sdk,
  packageName,
  basePort,
}) => {
  test.skip(excludeGen1(sdk));
  test.skip(
    packageName === 'nextjs-sdk-next-app' || packageName === 'remix',
    'This both packages are SSR hence getting symbol not found error'
  );
  test.skip(packageName === 'qwik-city', 'Qwik-city API not getting called');
  const urlMatch = /https:\/\/cdn\.builder\.io\/api\/v3\/content\/symbol/;
  await page.route(urlMatch, route => {
    const url = new URL(route.request().url());
    const queryIdParam = url.searchParams.get('query.id');
    let symbolToReturn = null;
    if (queryIdParam === '"e2a166f7d9544ed9ade283abf9491af3"') {
      symbolToReturn = GET_CONTENT_SYMBOL_UPDATE_ENTRY_ONE;
    } else if (queryIdParam === '"aa024e6851e94b49b99f41a2294fd423"') {
      symbolToReturn = GET_CONTENT_SYMBOL_UPDATE_ENTRY__TWO;
    } else {
      throw new Error(`Unknown query id: ${queryIdParam}`);
    }
    return route.fulfill({
      status: 200,
      json: {
        results: [symbolToReturn],
      },
    });
  });
  await launchEmbedderAndWaitForSdk({ path: '/symbol-update-entries', basePort, page, sdk });
  const newContent = cloneContent(MAIN_CONTENT);
  await page.frameLocator('iframe').getByText('Green Potato').waitFor();
  newContent.data.blocks[0].component.options.symbol.entry = 'aa024e6851e94b49b99f41a2294fd423';
  await sendContentUpdateMessage({ page, newContent, model: 'page' });
  await page.frameLocator('iframe').getByText('Red tomato').waitFor();
});
