"""Build the public outline downloads with the bundled document Python runtime."""
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
CONTENT = {
    "en-US": {
        "title": "Your story outline", "intro": "Use this optional guide to collect your ideas before creating a story with Mythoria. A few sentences are enough. You can leave sections blank and add more detail later.",
        "instruction": "Replace the questions and placeholders with your own text. Delete the fictional example and these instructions before importing the document into Mythoria.", "notes": "[Write your notes here]", "exampleTitle": "Fictional example to delete",
        "example": "Sofia finds a paper boat with a map inside. With her grandfather, she follows the map through their seaside village. When the tide rises, they must find a different route. The treasure is a box of letters from the grandfather’s childhood. The story should feel warm and adventurous.",
        "sections": [("The idea", "What is your story about? Who is it for? Is it fiction or a real memory?"), ("The main characters", "Who appears in the story? Describe their names, relationships, wishes and defining details."), ("The setting", "Where and when does it happen? Which places, sights, sounds or objects matter?"), ("The key events", "Describe the beginning, the challenge and the main events in order. What changes along the way?"), ("The ending and tone", "How would you like the story to end? What should the reader feel?"), ("Details to preserve", "List essential facts, phrases or memories, visual details for illustrations, and anything to avoid. For real memories, mark what is certain and what is unknown.")]
    },
    "pt-PT": {
        "title": "O guião da sua história", "intro": "Use este guia opcional para reunir as suas ideias antes de criar uma história com a Mythoria. Bastam algumas frases. Pode deixar secções em branco e acrescentar detalhes mais tarde.",
        "instruction": "Substitua as perguntas e os espaços de resposta pelo seu texto. Apague o exemplo fictício e estas instruções antes de importar o documento para a Mythoria.", "notes": "[Escreva aqui as suas notas]", "exampleTitle": "Exemplo fictício para apagar",
        "example": "A Sofia encontra um barco de papel com um mapa lá dentro. Com o avô, segue o mapa pela sua aldeia à beira-mar. Quando a maré sobe, têm de descobrir outro caminho. O tesouro é uma caixa de cartas da infância do avô. A história deve transmitir ternura e aventura.",
        "sections": [("A ideia", "Sobre o que é a sua história? A quem se destina? É ficção ou uma memória real?"), ("As personagens principais", "Quem participa na história? Descreva nomes, relações, desejos e pormenores importantes."), ("O cenário", "Onde e quando se passa? Que lugares, paisagens, sons ou objetos são importantes?"), ("Os acontecimentos principais", "Descreva o início, o desafio e os acontecimentos por ordem. O que muda ao longo da história?"), ("O final e o tom", "Como gostaria que a história terminasse? O que deve sentir quem a lê?"), ("Os detalhes a preservar", "Indique factos, frases ou memórias essenciais, detalhes visuais para as ilustrações e o que pretende evitar. Nas memórias reais, distinga o que sabe do que desconhece.")]
    },
    "es-ES": {
        "title": "El esquema de su historia", "intro": "Use esta guía opcional para reunir sus ideas antes de crear una historia con Mythoria. Bastan unas frases. Puede dejar secciones en blanco y añadir detalles más adelante.",
        "instruction": "Sustituya las preguntas y los espacios de respuesta por su texto. Elimine el ejemplo ficticio y estas instrucciones antes de importar el documento a Mythoria.", "notes": "[Escriba aquí sus notas]", "exampleTitle": "Ejemplo ficticio para eliminar",
        "example": "Sofía encuentra un barco de papel con un mapa dentro. Con su abuelo, sigue el mapa por su pueblo costero. Cuando sube la marea, deben buscar otra ruta. El tesoro es una caja de cartas de la infancia del abuelo. La historia debe transmitir ternura y aventura.",
        "sections": [("La idea", "¿De qué trata su historia? ¿Para quién es? ¿Es ficción o un recuerdo real?"), ("Los personajes principales", "¿Quién participa? Describa nombres, relaciones, deseos y detalles importantes."), ("El escenario", "¿Dónde y cuándo ocurre? ¿Qué lugares, paisajes, sonidos u objetos importan?"), ("Los acontecimientos principales", "Describa el inicio, el desafío y los acontecimientos por orden. ¿Qué cambia durante la historia?"), ("El final y el tono", "¿Cómo le gustaría que terminara? ¿Qué debe sentir quien la lea?"), ("Los detalles que conservar", "Indique hechos, frases o recuerdos esenciales, detalles visuales para las ilustraciones y lo que debe evitarse. En recuerdos reales, distinga lo conocido de lo desconocido.")]
    },
    "fr-FR": {
        "title": "Le plan de votre histoire", "intro": "Utilisez ce guide facultatif pour rassembler vos idées avant de créer une histoire avec Mythoria. Quelques phrases suffisent. Vous pouvez laisser des sections vides et ajouter des détails plus tard.",
        "instruction": "Remplacez les questions et les espaces de réponse par votre texte. Supprimez l’exemple fictif et ces instructions avant d’importer le document dans Mythoria.", "notes": "[Écrivez vos notes ici]", "exampleTitle": "Exemple fictif à supprimer",
        "example": "Sofia trouve un bateau en papier contenant une carte. Avec son grand-père, elle suit la carte dans leur village côtier. Lorsque la marée monte, ils doivent trouver un autre chemin. Le trésor est une boîte de lettres de l’enfance du grand-père. L’histoire doit évoquer la tendresse et l’aventure.",
        "sections": [("L’idée", "De quoi parle votre histoire ? À qui est-elle destinée ? Est-ce une fiction ou un souvenir réel ?"), ("Les personnages principaux", "Qui participe ? Décrivez les noms, les relations, les souhaits et les détails importants."), ("Le cadre", "Où et quand l’histoire se déroule-t-elle ? Quels lieux, paysages, sons ou objets comptent ?"), ("Les événements clés", "Décrivez le début, le défi et les événements dans l’ordre. Qu’est-ce qui change en chemin ?"), ("La fin et le ton", "Comment souhaitez-vous terminer l’histoire ? Que doit ressentir le lecteur ?"), ("Les détails à préserver", "Indiquez les faits, phrases ou souvenirs essentiels, les détails visuels pour les illustrations et les éléments à éviter. Pour les souvenirs réels, distinguez les certitudes des inconnues.")]
    },
    "de-DE": {
        "title": "Die Gliederung Ihrer Geschichte", "intro": "Sammeln Sie mit dieser freiwilligen Vorlage Ihre Ideen, bevor Sie mit Mythoria eine Geschichte erstellen. Wenige Sätze genügen. Sie können Abschnitte leer lassen und später ergänzen.",
        "instruction": "Ersetzen Sie die Fragen und Platzhalter durch Ihren eigenen Text. Löschen Sie das erfundene Beispiel und diese Anleitung vor dem Import in Mythoria.", "notes": "[Schreiben Sie hier Ihre Notizen]", "exampleTitle": "Erfundenes Beispiel zum Löschen",
        "example": "Sofia findet ein Papierboot mit einer Karte darin. Mit ihrem Großvater folgt sie der Karte durch ihr Küstendorf. Als die Flut steigt, müssen sie einen anderen Weg finden. Der Schatz ist eine Schachtel mit Briefen aus der Kindheit des Großvaters. Die Geschichte soll herzlich und abenteuerlich sein.",
        "sections": [("Die Idee", "Worum geht es? Für wen ist die Geschichte? Ist sie erfunden oder eine echte Erinnerung?"), ("Die Hauptfiguren", "Wer kommt vor? Beschreiben Sie Namen, Beziehungen, Wünsche und wichtige Einzelheiten."), ("Der Schauplatz", "Wo und wann spielt die Geschichte? Welche Orte, Eindrücke, Geräusche oder Gegenstände sind wichtig?"), ("Die wichtigsten Ereignisse", "Beschreiben Sie den Anfang, die Herausforderung und die Ereignisse in ihrer Reihenfolge. Was verändert sich?"), ("Das Ende und der Ton", "Wie soll die Geschichte enden? Was sollen die Lesenden dabei empfinden?"), ("Wichtige Einzelheiten", "Notieren Sie wesentliche Fakten, Sätze oder Erinnerungen, Bilddetails für Illustrationen und Dinge, die vermieden werden sollen. Trennen Sie bei echten Erinnerungen Gewissheiten von Unbekanntem.")]
    }
}

def build(locale, copy):
    doc = Document()
    for style in doc.styles:
        for border in list(style.element.iter(qn('w:pBdr'))):
            border.getparent().remove(border)
    section = doc.sections[0]
    section.page_width, section.page_height = Inches(8.27), Inches(11.69)
    section.top_margin = section.bottom_margin = Inches(0.7)
    section.left_margin = section.right_margin = Inches(0.8)
    normal = doc.styles['Normal']
    normal.font.name = 'Calibri'
    normal.font.size = Pt(11)
    normal.paragraph_format.line_spacing = 1.15
    normal.paragraph_format.space_after = Pt(8)
    normal.element.get_or_add_rPr().append(OxmlElement('w:lang'))
    normal.element.rPr.find(qn('w:lang')).set(qn('w:val'), locale)
    title = doc.styles['Title']
    title.font.name = 'Georgia'
    title.font.size = Pt(26)
    title.font.color.rgb = RGBColor(0, 0, 0)
    heading = doc.styles['Heading 1']
    heading.font.name = 'Calibri'
    heading.font.size = Pt(14)
    heading.font.color.rgb = RGBColor.from_string('073967')
    heading.paragraph_format.space_before = Pt(14)
    heading.paragraph_format.space_after = Pt(5)
    doc.add_picture(str(ROOT / 'public/images/logo/just_lettering.png'), width=Inches(1.8))
    doc.add_paragraph(copy['title'], 'Title')
    doc.add_paragraph(copy['intro'])
    note = doc.add_paragraph(copy['instruction'])
    for run in note.runs:
        run.font.size = Pt(10)
        run.font.color.rgb = RGBColor.from_string('595959')
    for i, (name, prompt) in enumerate(copy['sections']):
        if i == 3:
            doc.add_page_break()
        doc.add_heading(name, 1)
        p = doc.add_paragraph(prompt)
        p.paragraph_format.space_after = Pt(5)
        for run in p.runs:
            run.font.size = Pt(10)
            run.font.italic = True
            run.font.color.rgb = RGBColor.from_string('595959')
        response = doc.add_paragraph(copy['notes'])
        response.paragraph_format.space_after = Pt(22)
    doc.add_heading(copy['exampleTitle'], 1)
    doc.add_paragraph(copy['example'])
    footer = section.footer.paragraphs[0]
    footer.text = 'MYTHORIA  ·  mythoria.pt'
    footer.runs[0].font.size = Pt(9)
    doc.core_properties.title = copy['title']
    doc.core_properties.author = 'Mythoria'
    dest = ROOT / 'public/downloads/story-outline' / f'{locale}.docx'
    dest.parent.mkdir(parents=True, exist_ok=True)
    doc.save(dest)
    print(dest)

if __name__ == '__main__':
    for locale, copy in CONTENT.items():
        build(locale, copy)
