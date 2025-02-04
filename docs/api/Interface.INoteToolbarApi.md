[obsidian-note-toolbar](index.md) / INoteToolbarApi

Defines the functions that can be accessed from scripts (Dataview, Templater, JavaScript via JS Engine) -- that are executed from Note Toolbar items -- using the `ntb` object.

This is the documentation for the [Note Toolbar API](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API) page.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

### clipboard()

> **clipboard**: () => `Promise`\<`null` \| `string`\>

Gets the clipboard value.

#### Returns

`Promise`\<`null` \| `string`\>

The clipboard value or `null`.

#### Example

```ts
// gets the clipboard value
const value = await ntb.clipboard();

new Notice(value);
```

***

### modal()

> **modal**: (`content`, `options`?) => `Promise`\<`void`\>

Shows a modal with the provided content.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `content` | `string` \| `TFile` | Content to display in the modal, either as a string or a file within the vault. |
| `options`? | \{ `class`: `string`; `title`: `string`; \} | Optional display options. |
| `options.class`? | `string` | Optional CSS class(es) to add to the component. |
| `options.title`? | `string` | Optional title for the modal, rendered as markdown. |

#### Returns

`Promise`\<`void`\>

#### Examples

```ts
// shows a modal with the provided string
await ntb.modal("_Hello_ world!");
```

```ts
// shows a modal with the rendered contents of a file
const filename = "Welcome.md";
const file = app.vault.getAbstractFileByPath(filename);

if (file) {
  await ntb.modal(file, {
    title: `**${file.basename}**`
  });
}
else {
  new Notice(`File not found: ${filename}`);
}
```

#### See

`NtbModal.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).

***

### prompt()

> **prompt**: (`options`?) => `Promise`\<`null` \| `string`\>

Shows the prompt modal and waits for the user's input.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options`? | \{ `class`: `string`; `default`: `string`; `label`: `string`; `large`: `boolean`; `placeholder`: `string`; \} | Optional display options. |
| `options.class`? | `string` | Optional CSS class(es) to add to the component. |
| `options.default`? | `string` | Optional default value for text field. If not provided, no default value is set. |
| `options.label`? | `string` | Optional text shown above the text field, rendered as markdown. Default is no label. |
| `options.large`? | `boolean` | If set to `true`, the input field will be multi line. If not provided, defaults to `false`. |
| `options.placeholder`? | `string` | Optional text inside text field. Defaults to a preset message. |

#### Returns

`Promise`\<`null` \| `string`\>

The user's input.

#### Examples

```ts
// default (one-line) prompt with default placeholder message
const result = await ntb.prompt();

new Notice(result);
```

```ts
// large prompt with message, overridden placeholder, and default value 
const result = await ntb.prompt({
  label: "Enter some text",
  large: true,
  placeholder: "Placeholder",
  default: "Default"
});

new Notice(result);
```

#### See

`NtbPrompt.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).

***

### suggester()

> **suggester**: (`values`, `keys`?, `options`?) => `Promise`\<`null` \| `T`\>

Shows a suggester modal and waits for the user's selection.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `values` | `string`[] \| (`value`) => `string` | Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation. Rendered as markdown: optionally mix in Obsidian and plugin markdown (e.g., Iconize) to have it rendered |
| `keys`? | `T`[] | Optional array containing the keys of each item in the correct order. If not provided, values are returned on selection. |
| `options`? | \{ `class`: `string`; `limit`: `number`; `placeholder`: `string`; \} | Optional display options. |
| `options.class`? | `string` | Optional CSS class(es) to add to the component. |
| `options.limit`? | `number` | Optional limit of the number of items rendered at once (useful to improve performance when displaying large lists). |
| `options.placeholder`? | `string` | Optional text inside text field; defaults to preset message. |

#### Returns

`Promise`\<`null` \| `T`\>

The selected value, or corresponding key if keys are provided.

#### Examples

```ts
// shows a suggester that returns the selected value 
const values = ["value `1`", "value `2`"];

const selectedValue = await ntb.suggester(values);

new Notice(selectedValue);
```

```ts
// shows a suggester that returns a key corresponding to the selected value, and overrides placeholder text
const values = ["value `1`", "value `2`"];
const keys = ["key1", "key2"];

const selectedKey = await ntb.suggester(values, keys, {
  placeholder: "Pick something"
});

new Notice(selectedKey);
```

#### See

`NtbSuggester.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).
