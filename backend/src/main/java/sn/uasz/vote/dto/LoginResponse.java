package sn.uasz.vote.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {
    private String token;
    private String type = "Bearer";
    private Long id;
    private String matricule;
    private String nom;
    private String prenom;
    private String email;
    private Role role;
    private TypeElecteur typeElecteur;
    private String ufr;
    private String filiere;
    private String niveau;
}
