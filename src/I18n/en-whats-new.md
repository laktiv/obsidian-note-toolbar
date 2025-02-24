What's new in Note Toolbar v1.20?

## New Features 🎉

### Support for Audio, Images, PDF, and Video

Open the **Show toolbars in other views** heading (under **Folder mappings**) to add mapped toolbars to audio, images, PDF, and video files.

Support for canvases, the File menu, and New tab view are now also grouped under this heading.

<img src="https://github.com/user-attachments/assets/ac6a5066-e46e-4794-801b-db9cd5c62073" width="600"/>

### Add a command for any item

Add a command for any toolbar item you would like to execute from the command palette or a hot key. Use the new item action menu to add the command.

<img src="https://github.com/user-attachments/assets/ddcf0e37-c5ec-4f66-bdc9-71979e8ae92f" width="600"/>

Notes

- If the label and tooltip are empty, you won't be able to add the item.
- If the label uses variables or expressions, the tooltip will be used instead; if the tooltip's empty, or also has variables, the command won't be able to be added.
- _Thank you @Dopairym for the idea._

### Copy developer ID for items

Using the menu on items, copy the unique identifier (UUID) for the toolbar item to the clipboard, so that in code you can target the item and make changes to it.

Once you have the ID, you can fetch the HTML element. As an example:

```js
activeDocument.getElementById('112c7ed3-d5c2-4750-b95d-75bc84e23513');
```

_Thank you @laktiv for the idea._

## Improvements 🚀

### Settings improvements

- Toolbar search
  - Search field is now shown by default on desktop and tablet.
  - Arrow down out of the search field to navigate search results.
- The new item actions menu (on phones) now contains the **Duplicate item** and **Delete** options, which helps give more room in the UI for visibility settings on smaller phones.

---

## Previous releases

[v1.19](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.19.1): Canvas support, right-click to edit items, default item for floating buttons, toolbar search in settings

[v1.18](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.18.1): Add a toolbar to the New Tab view; Commands to show individual toolbars

[v1.17](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.17.0): Bottom toolbars, quick access to styles, API component improvements

[v1.16](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.16.0): Custom styles, API (Suggesters + Prompts), toolbar rendering and import improvements

[v1.15](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.15.0): Dataview, JS Engine, and Templater support