import { dispatchTurbolinks } from "./dispatchTurbolinks";

function copyElementAttributes(
  destinationElement: Element,
  sourceElement: Element
) {
  for (const { name, value } of Array.from(sourceElement.attributes)) {
    destinationElement.setAttribute(name, value);
  }
}

export function createScriptElement(element: Element, cb?: () => void) {
  if (element.getAttribute("data-turbolinks-eval") == "false") {
    return element;
  } else {
    const createdScriptElement = document.createElement("script");
    createdScriptElement.textContent = element.textContent;
    // async false makes scripts run in-order. it wont block js execution (thankfully)
    //   https://github.com/turbolinks/turbolinks/issues/282#issuecomment-355731712
    createdScriptElement.async = false;
    copyElementAttributes(createdScriptElement, element);
    if (cb) {
      createdScriptElement.addEventListener("load", cb);
    }
    return createdScriptElement;
  }
}

function replaceElementWithElement(fromElement: Element, toElement: Element) {
  const parentElement = fromElement.parentElement;
  if (parentElement) {
    return parentElement.replaceChild(toElement, fromElement);
  }
}
export function activateNewBodyScriptElements(
  newScriptElements: HTMLScriptElement[]
) {
  for (const inertScriptElement of newScriptElements) {
    const activatedScriptElement = createScriptElement(inertScriptElement);
    replaceElementWithElement(inertScriptElement, activatedScriptElement);
  }
}

/*
function relocateCurrentBodyPermanentElements() {
  return getCurrentBodyPermanentElements().reduce(
    (placeholders, permanentElement) => {
      const newElement = newSnapshot.getPermanentElementById(
        permanentElement.id
      );
      if (newElement) {
        const placeholder =
          createPlaceholderForPermanentElement(permanentElement);
        replaceElementWithElement(permanentElement, placeholder.element);
        replaceElementWithElement(newElement, permanentElement);
        return [...placeholders, placeholder];
      } else {
        return placeholders;
      }
    },
    [] as Placeholder[]
  );
}

function replacePlaceholderElementsWithClonedPermanentElements(
  placeholders: Placeholder[]
) {
  for (const { element, permanentElement } of placeholders) {
    const clonedElement = permanentElement.cloneNode(true);
    replaceElementWithElement(element, clonedElement);
  }
}

function getCurrentBodyPermanentElements(): PermanentElement[] {
  return currentSnapshot.getPermanentElementsPresentInSnapshot(newSnapshot);
}
*/
