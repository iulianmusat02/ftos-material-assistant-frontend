// document.designMode = 'on';

function callHTMLOPENAI() {
  let htmlOpenAIRequest = $("#htmlOpenAIRequest").val();
  let htmlOpenAIResponse = $("#htmlOpenAIResponse").html();
  if(htmlOpenAIResponse == '') {
    arg = 'Generate html: ' + htmlOpenAIRequest + " Note:(reply with body html only and do not include any css)";
  } else {
    arg = 'Update this html: ' + htmlOpenAIResponse + ' so ' + htmlOpenAIRequest + " Note:(reply with body html only and do not include any css)";
  }
  console.log(arg)
  callOpenAI(arg).then((res) => {
    $("#htmlOpenAIResponse").html(res);
    console.log(res);
  });
}


function callCSSOPENAI() {
  let cssOpenAIRequest = $("#cssOpenAIRequest").val();
  let cssOpenAIResponse = $("#cssOpenAIResponse").html();
  let htmlOpenAIResponse = $("#htmlOpenAIResponse").html();

  if(cssOpenAIResponse == '') {
    arg = 'Generate css to this html: ' + htmlOpenAIResponse + " so " + cssOpenAIRequest
  } else {
    arg = 'Update this css: ' + cssOpenAIResponse + " to this html: " + htmlOpenAIResponse + " so " + cssOpenAIRequest + " Note:(reply with css only and do not include any other string)";
  }
  console.log(arg);
  callOpenAI(arg).then((res) => {
    const opeaicss = sanitizeCSS(res);
    let cssjson = cssToJSON(opeaicss);
    let csstohtml = generateInputsFromJSON(cssjson);
    $('.tab-container-controlpanel').html(csstohtml);
    $("#cssOpenAIResponse").html(sanitizeCSS(opeaicss));
    controlpanelinputslistener();
  })
}

function callOpenAI(arg) {
    return new Promise( (res, rej) => {
      const message = arg;
      var url = 'http://localhost:3000/openai/chat';
      var body = {
        message: message,
      };
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
    
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          const openai = JSON.parse(xhr.responseText)[0].message.content;
          res(openai);
        } 
      };
      xhr.send(JSON.stringify(body));
    });
  }
  
function insertResult() {
  return new Promise( (res, rej) => {
    const body = {
        html : $("#htmlOpenAIResponse").html(),
        css : $("#cssOpenAIResponse").html(),
        componentType: $("#uiComponentType").val()
    };
    const url = 'http://localhost:3000/insertUIComponent';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const result = JSON.parse(xhr.responseText);
        console.log(result);
        res(result);
      } 
    };
    xhr.send(JSON.stringify(body));
  })
}

  

// events
$(function() {
  $("#insertUIComponent").on('click', function() {
    console.log()
    insertResult();
  });
  $(".tab-container-button").on('click', function(){
      let selected = $(this).attr('data-attr');
      $(".tab-container-button").removeClass('tab-container-button-active');
      $(this).addClass("tab-container-button-active");
      $(".tab-container").removeClass("tab-container-active");
      $(".tab-container-" + selected).addClass("tab-container-active");
  });
})
$("button#generateHtmlButton").on('click', () => {
  callHTMLOPENAI();
})
$("button#generateCSSButton").on('click', () => {
  callCSSOPENAI();
})

function controlpanelinputslistener() {
  $(".tab-container-controlpanel input").on('change', () => {
    console.log(generateJSONFromHTML($(".tab-container-controlpanel").html()));
    console.log(generateCSSFromJSON(generateJSONFromHTML($(".tab-container-controlpanel").html())))
    // console.log(css)
  }); 
}


function cssToJSON(json) {
  const styleData = json.replace(/<style>|<\/style>/g, '');
  const ruleRegex = /(\S+)\s*{\s*([^}]+)\s*}/g;
  const styles = {};

  let match;
  while ((match = ruleRegex.exec(styleData)) !== null) {
    const selector = match[1].trim();
    const declarations = match[2].trim();

    const propertyValuePairs = declarations.split(';');

    styles[selector] = {};

    for (const pair of propertyValuePairs) {
      if (pair.trim() === '') {
        continue;
      }

      const [property, value] = pair.split(':');
      styles[selector][property.trim()] = value.trim();
    }
  }

  return styles;
}
function generateInputsFromJSON(json) {
  let html = '';

  for (const selector in json) {
    if (json.hasOwnProperty(selector)) {
      const properties = json[selector];
      const selectorClassName = selector.toLowerCase();

      html += `<div class="${selectorClassName}"><h3>${selector}</h3>`;

      for (const property in properties) {
        if (properties.hasOwnProperty(property)) {
          const value = properties[property];
          const inputType = property.toLowerCase() === 'color' ? 'color' : 'text';
          const propertyClassName = property.toLowerCase();

          html += `<div class="${propertyClassName}"><label>${property}</label>`;
          html += `<input type="${inputType}" name="${selector}-${property}" value="${value}"></div>`;
        }
      }

      html += '</div>';
    }
  }

  return html;
}
function generateJSONFromHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const json = {};

  const selectorElements = doc.querySelectorAll('[class^="h"], [class^="p"]'); // Adjust the selector pattern as needed
  selectorElements.forEach((selectorElement) => {
    const selectorClass = selectorElement.className;
    const selectorName = selectorClass.replace('-', '');
    const properties = {};

    const propertyElements = selectorElement.querySelectorAll('.color, .font-size, .border-radius'); // Add more properties as needed
    propertyElements.forEach((propertyElement) => {
      const propertyName = propertyElement.querySelector('label').textContent.trim();
      const inputElements = propertyElement.querySelectorAll('input');
      const inputValue = inputElements[inputElements.length - 1].value;

      properties[propertyName] = inputValue;
    });

    json[selectorName] = properties;
  });

  return json;
}
function generateCSSFromJSON(json) {
  let css = '';
  for (const selector in json) {
    if (json.hasOwnProperty(selector)) {
      css += `${selector} {\n`;

      const properties = json[selector];

      for (const property in properties) {
        if (properties.hasOwnProperty(property)) {
          const value = properties[property];
          css += `  ${property}: ${value};\n`;
        }
      }

      css += '}\n\n';
    }
  }

  return css;
}
function sanitizeCSS(css) {
  const isValidCSS = (() => {
    try {
      new CSSStyleSheet().replaceSync(css);
      return true;
    } catch (error) {
      return false;
    }
  })();

  if (isValidCSS) {
    return css;
  }

  const lines = css.split('\n');
  const cleanedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '') {
      continue;
    }

    const cleanedLine = line.replace(/\s*([{}])\s*/g, '$1');

    cleanedLines.push(cleanedLine);
  }

  return cleanedLines.join('\n');
}
