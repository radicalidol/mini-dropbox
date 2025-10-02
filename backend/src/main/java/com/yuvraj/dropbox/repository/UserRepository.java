package com.yuvraj.dropbox.repository;

import com.yuvraj.dropbox.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, String> {
    User findByUsername(String username);
}
