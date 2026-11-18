package sn.uasz.vote.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

@Getter
public class CustomUserDetails extends User {

    private final boolean mustChangePassword;

    public CustomUserDetails(String username,
                             String password,
                             boolean enabled,
                             boolean accountNonLocked,
                             boolean mustChangePassword,
                             Collection<? extends GrantedAuthority> authorities) {
        super(username, password, enabled, true, true, accountNonLocked, authorities);
        this.mustChangePassword = mustChangePassword;
    }
}
