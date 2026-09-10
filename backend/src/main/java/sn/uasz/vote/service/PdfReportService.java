package sn.uasz.vote.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import sn.uasz.vote.dto.LiveResultsDto;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.awt.Color;

@Service
@RequiredArgsConstructor
public class PdfReportService {

    private final VotingService votingService;

    public ByteArrayInputStream generateElectionPdfReport(Long electionId) {
        LiveResultsDto results = votingService.getLiveResults(electionId);

        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Header Title
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.BLUE);
            Paragraph title = new Paragraph("UNIVERSITÉ ASSANE SECK DE ZIGUINCHOR", headerFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Font subHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.DARK_GRAY);
            Paragraph subtitle = new Paragraph("PROCÈS-VERBAL OFFICIEL DE DÉPOUILLEMENT", subHeaderFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);
            document.add(subtitle);

            // Election info
            Font infoFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
            document.add(new Paragraph("Scrutin : " + results.getElectionTitre(), infoFont));
            document.add(new Paragraph("Nombre total de suffrages exprimés : " + results.getTotalVotes(), infoFont));
            document.add(new Paragraph("Date d'édition : " + java.time.LocalDateTime.now(), infoFont));
            document.add(new Paragraph(" ", infoFont));

            // Table of Results
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1, 3, 2, 2});

            // Table Headers
            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.WHITE);
            PdfPCell h1 = new PdfPCell(new Phrase("N°", headFont));
            h1.setBackgroundColor(Color.DARK_GRAY);
            table.addCell(h1);

            PdfPCell h2 = new PdfPCell(new Phrase("Candidat / Liste", headFont));
            h2.setBackgroundColor(Color.DARK_GRAY);
            table.addCell(h2);

            PdfPCell h3 = new PdfPCell(new Phrase("Voix Obtenues", headFont));
            h3.setBackgroundColor(Color.DARK_GRAY);
            table.addCell(h3);

            PdfPCell h4 = new PdfPCell(new Phrase("Pourcentage", headFont));
            h4.setBackgroundColor(Color.DARK_GRAY);
            table.addCell(h4);

            int idx = 1;
            for (LiveResultsDto.CandidatureResultDto res : results.getCandidateResults()) {
                table.addCell(String.valueOf(idx++));
                table.addCell(res.getNomCandidat() + " (" + res.getNomListe() + ")");
                table.addCell(String.valueOf(res.getVoteCount()));
                table.addCell(res.getPercentage() + " %");
            }

            document.add(table);

            // Footer / Certification
            Paragraph certif = new Paragraph("\nCe document est certifié authentique et inaltérable par le système VoteUASZ.", FontFactory.getFont(FontFactory.HELVETICA, 10, Font.ITALIC));
            certif.setAlignment(Element.ALIGN_CENTER);
            certif.setSpacingBefore(30);
            document.add(certif);

            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Erreur lors de la génération du rapport PDF", e);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }
}
