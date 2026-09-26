package sn.uasz.vote.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.repository.UserRepository;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findByMatricule(identifier)
                .orElseGet(() -> userRepository.findByEmail(identifier)
                        .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé: " + identifier)));

        boolean accountNonLocked = user.getLockedUntil() == null || !java.time.LocalDateTime.now().isBefore(user.getLockedUntil());

        return new org.springframework.security.core.userdetails.User(
                user.getMatricule(),
                user.getPassword(),
                user.isActive(),
                true, true,
                accountNonLocked,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
