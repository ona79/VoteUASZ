package sn.uasz.vote.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import sn.uasz.vote.dto.LiveResultsDto;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class PdfReportService {

    private final VotingService votingService;

    // Couleurs officielles de la charte graphique VoteUASZ
    private static final Color COLOR_PRIMARY = new Color(4, 120, 87);      // #047857 Vert UASZ
    private static final Color COLOR_PRIMARY_DARK = new Color(6, 95, 70);   // #065f46 Vert Foncé
    private static final Color COLOR_WINNER_BG = new Color(236, 253, 245);  // #ecfdf5 Vert Clair
    private static final Color COLOR_HEADER_BG = new Color(4, 120, 87);     // #047857 Vert UASZ
    private static final Color COLOR_BG_LIGHT = new Color(248, 250, 252);   // #f8fafc Slate 50
    private static final Color COLOR_BORDER = new Color(226, 232, 240);     // #e2e8f0 Slate 200

    public ByteArrayInputStream generateElectionPdfReport(Long electionId) {
        LiveResultsDto results = votingService.getLiveResults(electionId);

        Document document = new Document(PageSize.A4, 36, 36, 36, 50);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new PdfFooterEventHelper());
            document.open();

            // 1. EN-TÊTE COMPRENANT LES DEUX LOGOS (UASZ À GAUCHE, VOTEUASZ À DROITE) ET LES TITRES INSTITUTIONNELS
            PdfPTable headerTable = new PdfPTable(3);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{1.5f, 5.0f, 1.5f});

            // Cellule Gauche : Logo UASZ
            Image logoUasz = loadImage("logo_uasz.png",
                    "frontend/photos/logo_uasz.png",
                    "../frontend/photos/logo_uasz.png",
                    "photos/logo_uasz.png",
                    "frontend/src/assets/logo_uasz.png",
                    "../frontend/src/assets/logo_uasz.png");
            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            leftCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            if (logoUasz != null) {
                logoUasz.setAlignment(Element.ALIGN_CENTER);
                leftCell.addElement(logoUasz);
            }
            headerTable.addCell(leftCell);

            // Cellule Centrale : Titres Officiels
            PdfPCell centerCell = new PdfPCell();
            centerCell.setBorder(Rectangle.NO_BORDER);
            centerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            centerCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, COLOR_PRIMARY);
            Paragraph title = new Paragraph("UNIVERSITÉ ASSANE SECK DE ZIGUINCHOR", headerFont);
            title.setAlignment(Element.ALIGN_CENTER);
            centerCell.addElement(title);

            Font subHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);
            Paragraph subHeader = new Paragraph("COMMISSION ÉLECTORALE CENTRALE — VOTEUASZ", subHeaderFont);
            subHeader.setAlignment(Element.ALIGN_CENTER);
            subHeader.setSpacingAfter(4);
            centerCell.addElement(subHeader);

            Font pvFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, COLOR_PRIMARY_DARK);
            Paragraph pvTitle = new Paragraph("PROCÈS-VERBAL OFFICIEL DE DÉPOUILLEMENT ET DE RÉSULTATS", pvFont);
            pvTitle.setAlignment(Element.ALIGN_CENTER);
            centerCell.addElement(pvTitle);

            headerTable.addCell(centerCell);

            // Cellule Droite : Logo VoteUASZ
            Image logoVoteUasz = loadImage("logo_vote_uasz.PNG",
                    "frontend/photos/logo_vote_uasz.PNG",
                    "../frontend/photos/logo_vote_uasz.PNG",
                    "photos/logo_vote_uasz.PNG",
                    "frontend/src/assets/logo_vote_uasz.PNG");
            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            rightCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            if (logoVoteUasz != null) {
                logoVoteUasz.setAlignment(Element.ALIGN_CENTER);
                rightCell.addElement(logoVoteUasz);
            }
            headerTable.addCell(rightCell);

            headerTable.setSpacingAfter(10);
            document.add(headerTable);

            // Ligne décorative vert UASZ
            PdfPTable lineTable = new PdfPTable(1);
            lineTable.setWidthPercentage(100);
            PdfPCell lineCell = new PdfPCell(new Phrase(""));
            lineCell.setBackgroundColor(COLOR_PRIMARY);
            lineCell.setFixedHeight(2.5f);
            lineCell.setBorder(Rectangle.NO_BORDER);
            lineTable.addCell(lineCell);
            lineTable.setSpacingAfter(15);
            document.add(lineTable);

            // 3. BLOC D'INFORMATIONS DU SCRUTIN
            PdfPTable infoBox = new PdfPTable(2);
            infoBox.setWidthPercentage(100);
            infoBox.setWidths(new float[]{3, 2});

            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);

            String formattedDate = formatFrenchDate(LocalDateTime.now());

            PdfPCell c1 = new PdfPCell();
            c1.setBackgroundColor(COLOR_BG_LIGHT);
            c1.setBorderColor(COLOR_BORDER);
            c1.setPadding(10f);
            c1.addElement(new Paragraph("Scrutin : " + results.getElectionTitre(), labelFont));
            c1.addElement(new Paragraph("Date d'édition du PV : " + formattedDate, valueFont));

            PdfPCell c2 = new PdfPCell();
            c2.setBackgroundColor(COLOR_BG_LIGHT);
            c2.setBorderColor(COLOR_BORDER);
            c2.setPadding(10f);
            c2.addElement(new Paragraph("Suffrages Exprimés : " + results.getTotalVotes() + " votes", labelFont));
            c2.addElement(new Paragraph("Statut du PV : Définitif et Certifié", valueFont));

            infoBox.addCell(c1);
            infoBox.addCell(c2);
            infoBox.setSpacingAfter(18);
            document.add(infoBox);

            // 4. DÉTERMINATION DU VAINQUEUR
            Long winnerCandidatureId = null;
            long maxVotes = -1;
            if (results.getCandidateResults() != null && results.getTotalVotes() > 0) {
                for (LiveResultsDto.CandidatureResultDto res : results.getCandidateResults()) {
                    if (res.getVoteCount() > maxVotes) {
                        maxVotes = res.getVoteCount();
                        winnerCandidatureId = res.getCandidatureId();
                    }
                }
            }

            // 5. TABLEAU DES RÉSULTATS
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{0.8f, 3.5f, 2.0f, 1.8f});

            // En-têtes du tableau
            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            String[] headers = {"N°", "Candidat", "Voix Obtenues", "Pourcentage"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headFont));
                cell.setBackgroundColor(COLOR_HEADER_BG);
                cell.setPadding(8f);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cell.setBorderColor(COLOR_BORDER);
                table.addCell(cell);
            }

            int idx = 1;
            for (LiveResultsDto.CandidatureResultDto res : results.getCandidateResults()) {
                boolean isWinner = winnerCandidatureId != null && winnerCandidatureId.equals(res.getCandidatureId()) && res.getVoteCount() > 0;
                Color rowBg = isWinner ? COLOR_WINNER_BG : (idx % 2 == 0 ? COLOR_BG_LIGHT : Color.WHITE);

                Font cellFont = isWinner
                        ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK)
                        : FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);

                // Col 1 : Index
                PdfPCell cellIdx = new PdfPCell(new Phrase(String.valueOf(idx++), cellFont));
                cellIdx.setBackgroundColor(rowBg);
                cellIdx.setPadding(7f);
                cellIdx.setHorizontalAlignment(Element.ALIGN_CENTER);
                cellIdx.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cellIdx.setBorderColor(COLOR_BORDER);
                table.addCell(cellIdx);

                // Col 2 : Nom du candidat + Badge Vainqueur si applicable
                Phrase candPhrase = new Phrase();
                String candName = (res.getNomCandidat() != null && !res.getNomCandidat().isBlank()) 
                        ? res.getNomCandidat() 
                        : (res.getNomListe() != null ? res.getNomListe() : "Candidat");
                candPhrase.add(new Chunk(candName, cellFont));
                if (isWinner) {
                    Font winnerBadgeFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, COLOR_PRIMARY);
                    candPhrase.add(new Chunk("  ★ VAINQUEUR", winnerBadgeFont));
                }
                PdfPCell cellCand = new PdfPCell(candPhrase);
                cellCand.setBackgroundColor(rowBg);
                cellCand.setPadding(7f);
                cellCand.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cellCand.setBorderColor(COLOR_BORDER);
                table.addCell(cellCand);

                // Col 3 : Voix obtenues
                PdfPCell cellVotes = new PdfPCell(new Phrase(res.getVoteCount() + " voix", cellFont));
                cellVotes.setBackgroundColor(rowBg);
                cellVotes.setPadding(7f);
                cellVotes.setHorizontalAlignment(Element.ALIGN_CENTER);
                cellVotes.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cellVotes.setBorderColor(COLOR_BORDER);
                table.addCell(cellVotes);

                // Col 4 : Pourcentage
                PdfPCell cellPct = new PdfPCell(new Phrase(res.getPercentage() + " %", cellFont));
                cellPct.setBackgroundColor(rowBg);
                cellPct.setPadding(7f);
                cellPct.setHorizontalAlignment(Element.ALIGN_CENTER);
                cellPct.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cellPct.setBorderColor(COLOR_BORDER);
                table.addCell(cellPct);
            }

            table.setSpacingAfter(20);
            document.add(table);

            // 6. CERTIFICATION ET SIGNATURE
            Font certifFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
            Paragraph certif = new Paragraph("Ce document est un Procès-Verbal officiel certifié conforme et inaltérable, généré automatiquement par la plateforme sécurisée VoteUASZ à la clôture du scrutin.", certifFont);
            certif.setAlignment(Element.ALIGN_CENTER);
            certif.setSpacingBefore(15);
            document.add(certif);

            document.close();
        } catch (Exception e) {
            log.error("[PDF] Erreur lors de la génération du Procès-Verbal PDF : {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la génération du rapport PDF", e);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    private Image loadImage(String resourceName, String... fileSystemPaths) {
        // 1. Essai depuis le Classpath Spring Boot (src/main/resources/)
        try {
            java.net.URL resourceUrl = getClass().getClassLoader().getResource(resourceName);
            if (resourceUrl != null) {
                Image img = Image.getInstance(resourceUrl);
                img.scaleToFit(55, 55);
                return img;
            }
        } catch (Exception e) {
            log.debug("[PDF] Impossible de charger {} depuis le classpath : {}", resourceName, e.getMessage());
        }

        // 2. Essai depuis le système de fichiers (chemins relatifs/absolus)
        for (String path : fileSystemPaths) {
            try {
                File file = new File(path);
                if (file.exists()) {
                    Image img = Image.getInstance(file.getAbsolutePath());
                    img.scaleToFit(55, 55);
                    return img;
                }
            } catch (Exception e) {
                log.debug("[PDF] Impossible de charger le logo depuis {} : {}", path, e.getMessage());
            }
        }
        return null;
    }

    private String formatFrenchDate(LocalDateTime dateTime) {
        if (dateTime == null) dateTime = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d MMMM yyyy 'à' HH:mm", Locale.FRENCH);
        return dateTime.format(formatter);
    }

    /**
     * Pied de page officiel imprimé en bas de chaque page du PDF
     */
    private static class PdfFooterEventHelper extends PdfPageEventHelper {
        private static final Font FOOTER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            float width = document.getPageSize().getWidth();

            // Rectangle vert UASZ en bas de page
            cb.setColorFill(COLOR_PRIMARY);
            cb.rectangle(0, 0, width, 26);
            cb.fill();

            // Texte centré du pied de page
            ColumnText.showTextAligned(
                    cb,
                    Element.ALIGN_CENTER,
                    new Phrase("VoteUASZ — Plateforme de vote électronique sécurisée | Université Assane Seck de Ziguinchor", FOOTER_FONT),
                    width / 2, 8, 0
            );
        }
    }
}

